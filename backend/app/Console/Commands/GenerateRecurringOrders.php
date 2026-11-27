<?php

/*
 * Lệnh chạy định kỳ để sinh đơn hàng cho các gói tháng.
 */

namespace App\Console\Commands;

use App\Models\ChiTietDonHang;
use App\Models\DangKyGoi;
use App\Models\DonHang;
use App\Models\ThanhToan;
use App\Services\RecurringOrderStockService;
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
        RecurringOrderStockService $recurringStock,
        ShippingDistanceService $shipping
    ): int {
        $today = CarbonImmutable::today();
        $mysqlWeekday = $today->dayOfWeek + 1;
        $generatedCount = 0;

        $this->retryPendingRecurringOrders($today, $recurringStock);

        DangKyGoi::query()
            ->whereIn('Trang_thai', ['Dang_hoat_dong', 'Tam_dung'])
            ->whereDate('Ngay_bat_dau', '<=', $today->toDateString())
            ->with(['goi.chiTiets', 'diaChi', 'lichGiao'])
            ->orderBy('Ma_dang_ky')
            ->chunkById(100, function ($registrations) use (
                $today,
                $mysqlWeekday,
                $recurringStock,
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
                            $mysqlWeekday,
                            $recurringStock,
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
                                ->where(function ($query) use ($today): void {
                                    $query->whereDate('Ngay_dat', $today->toDateString())
                                        ->orWhere('Ghi_chu', 'like', '%[[RECURRING_DELIVERY:'.$today->toDateString().']]%');
                                })
                                ->lockForUpdate()
                                ->exists();
                            if ($alreadyGenerated) {
                                return null;
                            }

                            $activeSchedule = $lockedRegistration->lichGiao()
                                ->where('Thu_trong_tuan', $mysqlWeekday)
                                ->where('Trang_thai', 'Hoat_dong')
                                ->first();
                            if (! $activeSchedule) {
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

                            $deliveryWindowNote = $activeSchedule->Khung_gio_giao
                                ? " • Khung giờ nhận: {$activeSchedule->Khung_gio_giao}"
                                : '';

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
                                'Ghi_chu' => 'Đơn tự động sinh từ gói định kỳ'.$deliveryWindowNote,
                            ]);

                            ThanhToan::query()->create([
                                'Ma_don_hang' => $order->Ma_don_hang,
                                'Ma_dang_ky_goi' => null,
                                'Phuong_thuc' => 'Mien_phi_goi',
                                'So_tien' => 0,
                                'Trang_thai' => 'Thanh_cong',
                                'Thoi_gian_thanh_toan' => now(),
                                'Noi_dung_thanh_toan' => 'GOI_DK_'.$lockedRegistration->Ma_dang_ky.'_'.$today->format('Ymd'),
                            ]);

                            foreach ($lockedRegistration->goi->chiTiets as $item) {
                                ChiTietDonHang::query()->create([
                                    'Ma_don_hang' => $order->Ma_don_hang,
                                    'Ma_san_pham' => $item->Ma_san_pham,
                                    'Ma_ct_flash_sale' => null,
                                    'So_luong' => $item->So_luong,
                                    'Don_gia' => 0,
                                    'Thanh_tien' => 0,
                                ]);

                            }

                            $recurringStock->tryAllocateOrder($order);

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

    private function retryPendingRecurringOrders(
        CarbonImmutable $today,
        RecurringOrderStockService $recurringStock
    ): void {
        DonHang::query()
            ->where('Loai_don', 'Dinh_ky')
            ->where('Trang_thai', 'Cho_xac_nhan')
            ->orderBy('Ma_don_hang')
            ->chunkById(100, function ($orders) use ($today, $recurringStock): void {
                foreach ($orders as $order) {
                    $deliveryDate = $recurringStock->availableDeliveryDate($order);
                    if ($deliveryDate !== null && $deliveryDate->isAfter($today)) {
                        continue;
                    }

                    try {
                        $recurringStock->tryAllocateOrder($order);
                    } catch (Throwable $exception) {
                        Log::error('Could not retry pending recurring order allocation.', [
                            'order_id' => $order->Ma_don_hang,
                            'exception' => $exception::class,
                        ]);
                    }
                }
            }, 'Ma_don_hang');
    }
}
