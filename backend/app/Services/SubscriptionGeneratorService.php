<?php

/*
 * Dịch vụ tự động tạo đơn hàng đến kỳ giao của gói định kỳ.
 */

namespace App\Services;

use App\Models\DangKyGoi;
use App\Models\DiaChiGiaoHang;
use App\Models\GoiDinhKy;
use App\Models\LichGiaoDinhKy;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class SubscriptionGeneratorService
{
    public function __construct(private GoongGeocodingService $geocoder)
    {
    }

    public function registerSubscription(int $userId, array $validated): DangKyGoi
    {
        // Ưu tiên địa chỉ hiện có; địa chỉ mới cần geocoding trước khi lưu.
        $shippingAddress = $validated['shipping_address'] ?? null;
        $address = isset($validated['address_id'])
            ? DiaChiGiaoHang::query()
                ->where('Ma_dia_chi', $validated['address_id'])
                ->where('Ma_nguoi_dung', $userId)
                ->firstOrFail()
            : null;
        $coordinates = null;

        if ($shippingAddress !== null) {
            // Idempotency key ngăn người dùng tạo hai gói khác nhau với cùng yêu cầu.
            $existingRegistration = DangKyGoi::query()
                ->where('Yeu_cau_idempotency', $validated['idempotency_key'])
                ->first();

            if ($existingRegistration && (int) $existingRegistration->Ma_nguoi_dung !== $userId) {
                abort(409, 'Mã yêu cầu đã được sử dụng.');
            }

            if (! $existingRegistration) {
                $fullAddress = implode(', ', [
                    $shippingAddress['street'],
                    $shippingAddress['ward'],
                    $shippingAddress['province'],
                ]);

                try {
                    // Xác định tọa độ giao hàng để các bước sau tính khoảng cách chính xác.
                    $coordinates = $this->geocoder->geocode($fullAddress);
                } catch (ConnectionException|RuntimeException $exception) {
                    Log::warning('Goong could not geocode a customer subscription address.', [
                        'exception' => $exception::class,
                    ]);

                    throw new SubscriptionAddressGeocodingException(
                        'Could not geocode the customer subscription address.',
                        0,
                        $exception
                    );
                }
            }
        }

        return DB::transaction(function () use (
            $validated,
            $userId,
            $address,
            $shippingAddress,
            $coordinates
        ): DangKyGoi {
            // Khóa bản đăng ký để xử lý song song cùng idempotency key chỉ tạo một bản ghi.
            $existing = DangKyGoi::query()
                ->where('Yeu_cau_idempotency', $validated['idempotency_key'])
                ->lockForUpdate()
                ->first();

            if ($existing) {
                if ((int) $existing->Ma_nguoi_dung !== $userId) {
                    abort(409, 'Mã yêu cầu đã được sử dụng.');
                }

                $existingDays = LichGiaoDinhKy::query()
                    ->where('Ma_dang_ky', $existing->Ma_dang_ky)
                    ->orderBy('Thu_trong_tuan')
                    ->get(['Thu_trong_tuan', 'Khung_gio_giao'])
                    ->map(fn (LichGiaoDinhKy $day) => [
                        'weekday' => (int) $day->Thu_trong_tuan,
                        'delivery_window' => $day->Khung_gio_giao,
                    ])
                    ->all();
                $requestedDays = collect($validated['delivery_days'])
                    ->map(fn (array $day) => [
                        'weekday' => (int) $day['weekday'],
                        'delivery_window' => $day['delivery_window'] ?? null,
                    ])
                    ->sortBy('weekday')
                    ->values()
                    ->all();

                $sameAddress = $shippingAddress === null
                    ? (int) $existing->Ma_dia_chi === (int) $address->Ma_dia_chi
                    : $this->addressMatches(
                        DiaChiGiaoHang::query()->findOrFail($existing->Ma_dia_chi),
                        $shippingAddress
                    );

                if (
                    (int) $existing->Ma_goi !== (int) $validated['package_id']
                    || ! $sameAddress
                    || $existing->Ngay_bat_dau !== $validated['start_date']
                    || $existingDays !== $requestedDays
                ) {
                    abort(409, 'Mã yêu cầu đã được dùng cho một nội dung đăng ký khác.');
                }

                return $existing;
            }

            $address ??= DiaChiGiaoHang::query()->create([
                'Ma_nguoi_dung' => $userId,
                'Ten_nguoi_nhan' => $shippingAddress['recipient_name'],
                'So_dien_thoai_nguoi_nhan' => $shippingAddress['phone'],
                'Dia_chi_chi_tiet' => $shippingAddress['street'],
                'Phuong_xa' => $shippingAddress['ward'],
                'Quan_huyen' => '',
                'Tinh_thanh' => $shippingAddress['province'],
                'Vi_do' => $coordinates['latitude'],
                'Kinh_do' => $coordinates['longitude'],
                'La_mac_dinh' => ! DiaChiGiaoHang::query()
                    ->where('Ma_nguoi_dung', $userId)
                    ->exists(),
            ]);

            $package = GoiDinhKy::query()
                ->where('Ma_goi', $validated['package_id'])
                ->where('Trang_thai', 'Dang_mo')
                ->lockForUpdate()
                ->firstOrFail();

            // Tính ngày kết thúc theo chu kỳ tháng và loại trừ ngày cuối dư.
            $startDate = CarbonImmutable::createFromFormat('!Y-m-d', $validated['start_date']);
            $endDate = $startDate
                ->addMonthsNoOverflow((int) $package->Ky_han_thang)
                ->subDay();

            $created = DangKyGoi::query()->create([
                'Ma_nguoi_dung' => $userId,
                'Ma_goi' => $package->Ma_goi,
                'Ma_dia_chi' => $address->Ma_dia_chi,
                'Ngay_bat_dau' => $startDate->toDateString(),
                'Ngay_ket_thuc' => $endDate->toDateString(),
                'Trang_thai' => 'Cho_thanh_toan',
                'Yeu_cau_idempotency' => $validated['idempotency_key'],
            ]);

            foreach ($validated['delivery_days'] as $day) {
                LichGiaoDinhKy::query()->create([
                    'Ma_dang_ky' => $created->Ma_dang_ky,
                    // Quy ước MySQL DAYOFWEEK: Chủ Nhật = 1, Thứ Bảy = 7.
                    'Thu_trong_tuan' => $day['weekday'],
                    'Khung_gio_giao' => $day['delivery_window'] ?? null,
                    'Trang_thai' => 'Hoat_dong',
                ]);
            }

            return $created;
        });
    }

    private function addressMatches(DiaChiGiaoHang $address, array $requested): bool
    {
        return $address->Ten_nguoi_nhan === $requested['recipient_name']
            && $address->So_dien_thoai_nguoi_nhan === $requested['phone']
            && $address->Dia_chi_chi_tiet === $requested['street']
            && $address->Phuong_xa === $requested['ward']
            && $address->Tinh_thanh === $requested['province'];
    }
}
