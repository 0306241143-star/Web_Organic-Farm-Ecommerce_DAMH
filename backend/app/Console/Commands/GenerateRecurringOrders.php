<?php

/*
 * Lệnh chạy định kỳ để sinh đơn hàng cho các gói tháng.
 */

namespace App\Console\Commands;

use App\Models\ChiTietDonHang;
use App\Models\DangKyGoi;
use App\Models\DonHang;
use App\Models\PhanBoLoHang;
use App\Services\FefoStockService;
use App\Services\ShippingDistanceService;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class GenerateRecurringOrders extends Command
{
    protected $signature = 'subscriptions:generate-orders';

    protected $description = 'Tạo đơn hàng đến kỳ giao của các gói định kỳ';

    public function handle(
        FefoStockService $stock,
        ShippingDistanceService $shipping
    ): int
    {
        $today = CarbonImmutable::today();
        $mysqlWeekday = $today->dayOfWeek + 1;
        $generatedCount = 0;

        DangKyGoi::query()
            ->whereIn('Trang_thai', ['Dang_hoat_dong', 'Tam_dung'])
            ->whereDate('Ngay_bat_dau', '<=', $today->toDateString())
            ->with(['goi.chiTiets', 'diaChi', 'lichGiao'])
            ->orderBy('Ma_dang_ky')
            ->chunkById(100, function ($registrations) use (
                $today,
                $mysqlWeekday,
                $stock,
                $shipping,
                &$generatedCount
            ): void {
                foreach ($registrations as $registration) {
                    if (CarbonImmutable::parse($registration->Ngay_ket_thuc)->isBefore($today)) {
                        DangKyGoi::query()
                            ->whereKey($registration->Ma_dang_ky)
                            ->where('Trang_thai', 'Dang_hoat_dong')
                            ->update(['Trang_thai' => 'Het_han']);

                        continue;
                    }

                    if ($registration->Trang_thai !== 'Dang_hoat_dong') {
                        continue;
                    }

                    $scheduledToday = $registration->lichGiao
                        ->first(fn ($schedule): bool => (int) $schedule->Thu_trong_tuan === $mysqlWeekday
                            && $schedule->Trang_thai === 'Hoat_dong');
                    if (! $scheduledToday) {
                        continue;
                    }

                    try {
                        $created = DB::transaction(function () use (
                            $registration,
                            $today,
                            $stock,
                            $shipping
                        ): ?DonHang {
                            $lockedRegistration = DangKyGoi::query()
                                ->whereKey($registration->Ma_dang_ky)
                                ->lockForUpdate()
                                ->first();
                            if (
                                ! $lockedRegistration
                                || $lockedRegistration->Trang_thai !== 'Dang_hoat_dong'
                                || CarbonImmutable::parse($lockedRegistration->Ngay_bat_dau)->isAfter($today)
                                || CarbonImmutable::parse($lockedRegistration->Ngay_ket_thuc)->isBefore($today)
                            ) {
                                return null;
                            }

                            $alreadyGenerated = DonHang::query()
                                ->where('Ma_dang_ky_goi', $lockedRegistration->Ma_dang_ky)
                                ->where('Loai_don', 'Dinh_ky')
                                ->whereDate('Ngay_dat', $today->toDateString())
                                ->lockForUpdate()
                                ->exists();
                            if ($alreadyGenerated) {
                                return null;
                            }

                            $scheduleStillActive = $lockedRegistration->lichGiao()
                                ->where('Thu_trong_tuan', $today->dayOfWeek + 1)
                                ->where('Trang_thai', 'Hoat_dong')
                                ->exists();
                            if (! $scheduleStillActive) {
                                return null;
                            }

                            $delivery = ['distance_km' => 0, 'shipping_fee' => 0];
                            if ($lockedRegistration->diaChi) {
                                try {
                                    $delivery = $shipping->estimate($lockedRegistration->diaChi);
                                } catch (Throwable $exception) {
                                    Log::warning('Recurring subscription shipping estimate failed; using zero delivery fee.', [
                                        'subscription_id' => $lockedRegistration->Ma_dang_ky,
                                        'exception' => $exception::class,
                                    ]);
                                }
                            }

                            $order = DonHang::query()->create([
                                'Ma_nguoi_dung' => $lockedRegistration->Ma_nguoi_dung,
                                'Ma_dia_chi' => $lockedRegistration->Ma_dia_chi,
                                'Ma_dang_ky_goi' => $lockedRegistration->Ma_dang_ky,
                                'Loai_don' => 'Dinh_ky',
                                'Ngay_dat' => now(),
                                'Tien_hang' => 0,
                                'Khoang_cach_km' => $delivery['distance_km'] ?? 0,
                                'Phi_giao_hang' => $delivery['shipping_fee'] ?? 0,
                                'So_diem_su_dung' => 0,
                                'Tien_giam_tu_diem' => 0,
                                'Tong_tien' => 0,
                                'Trang_thai' => 'Cho_xac_nhan',
                                'Ghi_chu' => 'Đơn tự động sinh từ gói định kỳ',
                            ]);

                            foreach ($lockedRegistration->goi->chiTiets as $item) {
                                $detail = ChiTietDonHang::query()->create([
                                    'Ma_don_hang' => $order->Ma_don_hang,
                                    'Ma_san_pham' => $item->Ma_san_pham,
                                    'Ma_ct_flash_sale' => null,
                                    'So_luong' => $item->So_luong,
                                    'Don_gia' => 0,
                                    'Thanh_tien' => 0,
                                ]);

                                foreach ($stock->allocateBatches(
                                    (int) $item->Ma_san_pham,
                                    (float) $item->So_luong
                                ) as $allocation) {
                                    PhanBoLoHang::query()->create([
                                        'Ma_ct_don_hang' => $detail->Ma_ct_don_hang,
                                        'Ma_lo_hang' => $allocation['batch_id'],
                                        'So_luong_xuat' => $allocation['quantity'],
                                    ]);
                                }
                            }

                            return $order;
                        });

                        if ($created) {
                            $generatedCount++;
                        }
                    } catch (Throwable $exception) {
                        Log::error('Could not generate recurring subscription order.', [
                            'subscription_id' => $registration->Ma_dang_ky,
                            'exception' => $exception::class,
                        ]);
                    }
                }
            }, 'Ma_dang_ky');

        $this->info("Generated {$generatedCount} recurring subscription order(s).");

        return self::SUCCESS;
    }
}
