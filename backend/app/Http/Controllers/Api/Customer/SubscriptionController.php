<?php

/*
 * Luồng khách hàng: đăng ký gói rau theo tháng và lịch giao hàng.
 */

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreSubscriptionRequest;
use App\Models\DangKyGoi;
use App\Models\DiaChiGiaoHang;
use App\Models\GoiDinhKy;
use App\Models\LichGiaoDinhKy;
use App\Models\ThanhToan;
use App\Services\ApiPayPaymentService;
use App\Services\GoongGeocodingService;
use App\Traits\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class SubscriptionController extends Controller
{
    use ApiResponse;

    /**
     * Lưu gói và toàn bộ lịch trong một transaction; đăng ký chỉ hoạt động sau ApiPay webhook.
     */
    public function store(StoreSubscriptionRequest $request, GoongGeocodingService $geocoder): JsonResponse
    {
        $validated = $request->validated();
        $userId = (int) $request->user()->getAuthIdentifier();
        $shippingAddress = $validated['shipping_address'] ?? null;
        $address = isset($validated['address_id'])
            ? DiaChiGiaoHang::query()
                ->where('Ma_dia_chi', $validated['address_id'])
                ->where('Ma_nguoi_dung', $userId)
                ->firstOrFail()
            : null;
        $coordinates = null;

        if ($shippingAddress !== null) {
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
                    $shippingAddress['district'],
                    $shippingAddress['province'],
                ]);

                try {
                    $coordinates = $geocoder->geocode($fullAddress);
                } catch (ConnectionException|RuntimeException $exception) {
                    Log::warning('Goong could not geocode a customer subscription address.', [
                        'exception' => $exception::class,
                    ]);

                    return $this->errorResponse(
                        message: 'Không thể xác định tọa độ địa chỉ. Vui lòng kiểm tra địa chỉ hoặc liên hệ quản trị viên.',
                        status: 422,
                        errorCode: self::ERR_BAD_REQUEST
                    );
                }
            }
        }

        $registration = DB::transaction(function () use ($validated, $userId, $address, $shippingAddress, $coordinates): DangKyGoi {
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
                'Quan_huyen' => $shippingAddress['district'],
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

        return $this->successResponse(
            message: 'Tạo đăng ký gói thành công. Vui lòng thanh toán để kích hoạt gói.',
            data: [
                'subscription_id' => (int) $registration->Ma_dang_ky,
                'package_id' => (int) $registration->Ma_goi,
                'start_date' => $registration->Ngay_bat_dau,
                'end_date' => $registration->Ngay_ket_thuc,
                'status' => $registration->Trang_thai,
            ],
            status: 201
        );
    }

    /**
     * Compare user-entered address fields with the saved snapshot for an idempotent retry.
     */
    private function addressMatches(DiaChiGiaoHang $address, array $requested): bool
    {
        return $address->Ten_nguoi_nhan === $requested['recipient_name']
            && $address->So_dien_thoai_nguoi_nhan === $requested['phone']
            && $address->Dia_chi_chi_tiet === $requested['street']
            && $address->Phuong_xa === $requested['ward']
            && $address->Quan_huyen === $requested['district']
            && $address->Tinh_thanh === $requested['province'];
    }

    /**
     * Tạo hoặc khôi phục yêu cầu ApiPay cho đăng ký đang chờ thanh toán.
     */
    public function checkout(
        Request $request,
        int $subscriptionId,
        ApiPayPaymentService $apiPay
    ): JsonResponse {
        $validated = $request->validate([
            'bank_public_id' => ['sometimes', 'string', 'max:100'],
        ]);
        $bankPublicId = $validated['bank_public_id'] ?? config('services.apipay.bank_public_id');

        if (
            ! is_string($bankPublicId)
            || $bankPublicId === ''
            || ! $apiPay->configurationStatus()['ready']
        ) {
            throw ValidationException::withMessages([
                'bank_public_id' => 'ApiPay chưa được cấu hình đầy đủ thông tin thanh toán và webhook.',
            ]);
        }

        $userId = (int) $request->user()->getAuthIdentifier();
        $registration = DangKyGoi::query()
            ->where('Ma_dang_ky', $subscriptionId)
            ->where('Ma_nguoi_dung', $userId)
            ->firstOrFail();

        if ($registration->Trang_thai !== 'Cho_thanh_toan') {
            throw ValidationException::withMessages([
                'subscription_id' => 'Đăng ký không ở trạng thái chờ thanh toán.',
            ]);
        }

        $existingPayment = ThanhToan::query()
            ->where('Ma_dang_ky_goi', $registration->Ma_dang_ky)
            ->where('Phuong_thuc', 'ApiPay')
            ->where('Trang_thai', 'Khoi_tao')
            ->latest('Ma_thanh_toan')
            ->first();

        if ($existingPayment) {
            if (! $existingPayment->Ma_yeu_cau_apipay) {
                throw ValidationException::withMessages([
                    'subscription_id' => 'Yêu cầu thanh toán trước có thể đã được ApiPay tiếp nhận; hãy kiểm tra trạng thái trước khi thử lại.',
                ]);
            }

            $remotePayment = $apiPay->getPaymentRequest($existingPayment->Ma_yeu_cau_apipay);
            if (($remotePayment['status'] ?? null) === 'ACTIVE' && ! empty($remotePayment['payUrl'])) {
                return $this->paymentResponse($existingPayment, $remotePayment, 200);
            }

            if (in_array($remotePayment['status'] ?? null, ['EXPIRED', 'CANCELLED'], true)) {
                $existingPayment->update(['Trang_thai' => 'That_bai']);
            } else {
                throw ValidationException::withMessages([
                    'subscription_id' => 'Yêu cầu thanh toán hiện tại cần được đối soát trước khi thử lại.',
                ]);
            }
        }

        $payment = DB::transaction(function () use ($registration, $userId): ThanhToan {
            $lockedRegistration = DangKyGoi::query()
                ->whereKey($registration->Ma_dang_ky)
                ->where('Ma_nguoi_dung', $userId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedRegistration->Trang_thai !== 'Cho_thanh_toan') {
                throw ValidationException::withMessages([
                    'subscription_id' => 'Đăng ký đã thay đổi trạng thái.',
                ]);
            }

            $pendingPaymentExists = ThanhToan::query()
                ->where('Ma_dang_ky_goi', $lockedRegistration->Ma_dang_ky)
                ->where('Phuong_thuc', 'ApiPay')
                ->where('Trang_thai', 'Khoi_tao')
                ->exists();

            if ($pendingPaymentExists) {
                throw ValidationException::withMessages([
                    'subscription_id' => 'Đăng ký đã có yêu cầu thanh toán đang được khởi tạo.',
                ]);
            }

            $package = GoiDinhKy::query()
                ->whereKey($lockedRegistration->Ma_goi)
                ->where('Trang_thai', 'Dang_mo')
                ->lockForUpdate()
                ->firstOrFail();
            $amount = (float) $package->Gia_goi;

            if ($amount < 1 || $amount > 300_000_000 || $amount !== (float) (int) $amount) {
                throw ValidationException::withMessages([
                    'subscription_id' => 'Giá gói không hợp lệ để thanh toán qua ApiPay.',
                ]);
            }

            return ThanhToan::query()->create([
                'Ma_dang_ky_goi' => $lockedRegistration->Ma_dang_ky,
                'Phuong_thuc' => 'ApiPay',
                'Noi_dung_thanh_toan' => 'DK'.$lockedRegistration->Ma_dang_ky.'X'.Str::upper(Str::random(8)),
                'So_tien' => (int) $amount,
                'Trang_thai' => 'Khoi_tao',
            ]);
        });

        try {
            $remotePayment = $apiPay->createPaymentRequest(
                $bankPublicId,
                (int) $payment->So_tien,
                $payment->Noi_dung_thanh_toan
            );
        } catch (ConnectionException|RuntimeException $exception) {
            Log::warning('ApiPay subscription payment request could not be confirmed; keeping it pending for reconciliation.', [
                'payment_id' => $payment->Ma_thanh_toan,
                'exception' => $exception::class,
            ]);

            throw $exception;
        }

        $payment->update([
            'Ma_yeu_cau_apipay' => $remotePayment['public_id'],
            'Duong_dan_thanh_toan' => $remotePayment['pay_url'],
        ]);

        return $this->paymentResponse($payment, $remotePayment, 201);
    }

    /**
     * Chỉ trả trạng thái đăng ký cho đúng chủ sở hữu.
     */
    public function show(Request $request, int $subscriptionId): JsonResponse
    {
        $registration = DangKyGoi::query()
            ->where('Ma_dang_ky', $subscriptionId)
            ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
            ->firstOrFail();
        $payment = ThanhToan::query()
            ->where('Ma_dang_ky_goi', $registration->Ma_dang_ky)
            ->where('Phuong_thuc', 'ApiPay')
            ->latest('Ma_thanh_toan')
            ->first();

        return $this->successResponse(
            message: 'Lấy trạng thái đăng ký gói thành công.',
            data: [
                'subscription_id' => (int) $registration->Ma_dang_ky,
                'status' => $registration->Trang_thai,
                'start_date' => $registration->Ngay_bat_dau,
                'end_date' => $registration->Ngay_ket_thuc,
                'payment_status' => $payment?->Trang_thai,
            ]
        );
    }

    private function paymentResponse(ThanhToan $payment, array $remote, int $status): JsonResponse
    {
        return $this->successResponse(
            message: $status === 201
                ? 'Khởi tạo thanh toán ApiPay cho gói thành công.'
                : 'Lấy liên kết thanh toán ApiPay hiện có thành công.',
            data: [
                'payment_request_id' => $payment->Ma_yeu_cau_apipay ?? $remote['public_id'] ?? null,
                'pay_url' => $remote['pay_url'] ?? $remote['payUrl'] ?? null,
                'qr_url' => $remote['qr_url'] ?? $remote['qrUrl'] ?? null,
                'status' => $remote['status'] ?? null,
                'expires_at' => $remote['expires_at'] ?? $remote['expiresAt'] ?? null,
            ],
            status: $status
        );
    }
}
