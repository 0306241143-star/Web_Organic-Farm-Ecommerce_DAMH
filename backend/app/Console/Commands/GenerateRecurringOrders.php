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
        // Chốt ngày chạy theo múi giờ ứng dụng để mọi lịch giao dùng cùng một mốc.
        $today = CarbonImmutable::today();

        // Đổi thứ trong tuần của Carbon (Chủ nhật = 0) sang quy ước lưu trong MySQL (Chủ nhật = 1).
        $mysqlWeekday = $today->dayOfWeek + 1;

        // Đếm số đơn định kỳ mới được tạo trong lần chạy này.
        $generatedCount = 0;

        // Thử phân bổ lại hàng cho các đơn định kỳ trước đó đang chờ đủ tồn kho.
        $this->retryPendingRecurringOrders($today, $recurringStock);

        // Lấy các đăng ký đã bắt đầu; tải trước gói hàng, địa chỉ và lịch để tránh truy vấn lặp.
        DangKyGoi::query()
            ->whereIn('Trang_thai', ['Dang_hoat_dong', 'Tam_dung'])
            ->whereDate('Ngay_bat_dau', '<=', $today->toDateString())
            ->with(['goi.chiTiets', 'diaChi', 'lichGiao'])
            ->orderBy('Ma_dang_ky')
            // Chia đăng ký thành từng nhóm để giới hạn bộ nhớ khi hệ thống có nhiều khách.
            ->chunkById(100, function ($registrations) use (
                $today,
                $mysqlWeekday,
                $recurringStock,
                $shipping,
                &$generatedCount
            ): void {
                // Kiểm tra từng đăng ký trước khi quyết định có tạo đơn hôm nay hay không.
                foreach ($registrations as $registration) {
                    // Đánh dấu hết hạn nếu ngày kết thúc đã qua, rồi bỏ qua đăng ký này.
                    if (CarbonImmutable::parse($registration->Ngay_ket_thuc)->isBefore($today)) {
                        DangKyGoi::query()
                            ->whereKey($registration->Ma_dang_ky)
                            ->where('Trang_thai', 'Dang_hoat_dong')
                            ->update(['Trang_thai' => 'Het_han']);

                        continue;
                    }

                    // Không tạo đơn cho đăng ký đang tạm dừng hoặc ở trạng thái khác hoạt động.
                    if ($registration->Trang_thai !== 'Dang_hoat_dong') {
                        continue;
                    }

                    // Chỉ tiếp tục nếu đăng ký có lịch hoạt động rơi đúng vào thứ hôm nay.
                    $scheduledToday = $registration->lichGiao
                        ->first(fn ($schedule): bool => (int) $schedule->Thu_trong_tuan === $mysqlWeekday
                            && $schedule->Trang_thai === 'Hoat_dong');

                    // Bỏ qua đăng ký không có lịch giao hôm nay.
                    if (! $scheduledToday) {
                        continue;
                    }

                    try {
                        // Bao toàn bộ thao tác tạo đơn trong transaction để tránh dữ liệu dở dang.
                        $created = DB::transaction(function () use (
                            $registration,
                            $today,
                            $mysqlWeekday,
                            $recurringStock,
                            $shipping
                        ): ?DonHang {
                            // Khóa đăng ký và kiểm tra lại trạng thái/ngày để tránh xử lý đồng thời.
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

                            // Chặn tạo trùng đơn nếu đăng ký đã có đơn cho ngày này.
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

                            // Đọc lại lịch giao đang hoạt động sau khi đã khóa đăng ký.
                            $activeSchedule = $lockedRegistration->lichGiao()
                                ->where('Thu_trong_tuan', $mysqlWeekday)
                                ->where('Trang_thai', 'Hoat_dong')
                                ->first();
                            if (! $activeSchedule) {
                                return null;
                            }

                            // Mặc định phí giao bằng 0; nếu có địa chỉ thì thử tính phí thực tế.
                            $delivery = ['distance_km' => 0, 'shipping_fee' => 0];
                            if ($lockedRegistration->diaChi) {
                                try {
                                    $delivery = $shipping->estimate($lockedRegistration->diaChi);
                                } catch (Throwable $exception) {
                                    // Ghi log lỗi và giữ mức phí mặc định để lịch sinh đơn vẫn tiếp tục.
                                    Log::warning('Recurring subscription shipping estimate failed; using zero delivery fee.', [
                                        'subscription_id' => $lockedRegistration->Ma_dang_ky,
                                        'exception' => $exception::class,
                                    ]);
                                }
                            }

                            // Thêm khung giờ nhận vào ghi chú nếu lịch giao có khai báo.
                            $deliveryWindowNote = $activeSchedule->Khung_gio_giao
                                ? " • Khung giờ nhận: {$activeSchedule->Khung_gio_giao}"
                                : '';

                            // Tạo đơn miễn phí gắn với đăng ký và địa chỉ giao hàng hiện tại.
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

                            // Ghi nhận khoản thanh toán 0 đồng của gói đã được thanh toán trước.
                            ThanhToan::query()->create([
                                'Ma_don_hang' => $order->Ma_don_hang,
                                'Ma_dang_ky_goi' => null,
                                'Phuong_thuc' => 'Mien_phi_goi',
                                'So_tien' => 0,
                                'Trang_thai' => 'Thanh_cong',
                                'Thoi_gian_thanh_toan' => now(),
                                'Noi_dung_thanh_toan' => 'GOI_DK_'.$lockedRegistration->Ma_dang_ky.'_'.$today->format('Ymd'),
                            ]);

                            // Sao chép từng sản phẩm trong gói thành chi tiết của đơn giao kỳ này.
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

                            // Thử phân bổ lô hàng; nếu thiếu hàng, dịch vụ giữ đơn ở trạng thái chờ xử lý.
                            $recurringStock->tryAllocateOrder($order);

                            return $order;
                        });

                        // Chỉ tính là đơn mới nếu transaction thực sự trả về đơn vừa tạo.
                        if ($created) {
                            $generatedCount++;
                        }
                    } catch (Throwable $exception) {
                        // Ghi lỗi theo mã đăng ký để có thể tra cứu mà không dừng các đăng ký còn lại.
                        Log::error('Could not generate recurring subscription order.', [
                            'subscription_id' => $registration->Ma_dang_ky,
                            'exception' => $exception::class,
                        ]);
                    }
                }
            }, 'Ma_dang_ky');

        // In số đơn mới để theo dõi kết quả lần chạy.
        $this->info("Generated {$generatedCount} recurring subscription order(s).");

        // Báo cho Laravel Scheduler rằng lệnh đã kết thúc thành công.
        return self::SUCCESS;
    }

    private function retryPendingRecurringOrders(
        CarbonImmutable $today,
        RecurringOrderStockService $recurringStock
    ): void {
        // Chỉ xét đơn định kỳ còn chờ xác nhận, tức chưa phân bổ đủ hàng.
        DonHang::query()
            ->where('Loai_don', 'Dinh_ky')
            ->where('Trang_thai', 'Cho_xac_nhan')
            ->orderBy('Ma_don_hang')
            // Phân trang theo mã đơn để có thể xử lý an toàn danh sách lớn.
            ->chunkById(100, function ($orders) use ($today, $recurringStock): void {
                // Kiểm tra từng đơn đang chờ để chỉ thử lại khi đã đến ngày giao.
                foreach ($orders as $order) {
                    $deliveryDate = $recurringStock->availableDeliveryDate($order);

                    // Nếu đơn đã được hoãn sang ngày sau, chưa phân bổ lại trong lần chạy hôm nay.
                    if ($deliveryDate !== null && $deliveryDate->isAfter($today)) {
                        continue;
                    }

                    try {
                        // Thử phân bổ lại từ tồn kho hiện có.
                        $recurringStock->tryAllocateOrder($order);
                    } catch (Throwable $exception) {
                        // Ghi lại lỗi của đơn này rồi tiếp tục xử lý các đơn còn lại.
                        Log::error('Could not retry pending recurring order allocation.', [
                            'order_id' => $order->Ma_don_hang,
                            'exception' => $exception::class,
                        ]);
                    }
                }
            }, 'Ma_don_hang');
    }
}
