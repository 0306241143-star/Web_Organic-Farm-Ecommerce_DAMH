<?php
// Hủy đơn bán lẻ chờ thanh toán quá hạn
namespace App\Console\Commands;

use App\Models\DonHang;
use App\Services\Order\OrderCancellationService;
use Illuminate\Console\Command;

class ExpirePendingRetailOrders extends Command
{
    protected $signature = 'orders:expire-pending-payments';

    protected $description = 'Cancel overdue ApiPay orders and restore reserved inventory and rewards.';

    public function handle(OrderCancellationService $cancellations): int
    {
        // Đọc thời hạn chờ thanh toán từ cấu hình và bảo đảm giá trị tối thiểu là 1 phút.
        $timeoutMinutes = max(
            1,
            (int) config('services.checkout.pending_payment_timeout_minutes', 30)
        );

        // Đơn tạo trước mốc này được xem là đã chờ thanh toán quá lâu.
        $deadline = now()->subMinutes($timeoutMinutes);

        // Đếm số đơn thực sự được dịch vụ hủy thành công.
        $expiredCount = 0;

        // Tìm đơn đang chờ thanh toán, quá hạn và có giao dịch ApiPay chưa hoàn tất.
        DonHang::query()
            ->where('Trang_thai', 'Cho_thanh_toan')
            ->where('created_at', '<=', $deadline)
            // Chỉ chọn đơn có giao dịch khởi tạo qua ApiPay để không hủy các loại thanh toán khác.
            ->whereExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('thanh_toan')
                    ->whereColumn('thanh_toan.Ma_don_hang', 'don_hang.Ma_don_hang')
                    ->where('thanh_toan.Phuong_thuc', 'ApiPay')
                    ->where('thanh_toan.Trang_thai', 'Khoi_tao');
            })
            ->orderBy('Ma_don_hang')
            // Chia kết quả thành từng nhóm để xử lý số lượng đơn lớn mà không tốn nhiều bộ nhớ.
            ->chunkById(100, function ($orders) use ($cancellations, &$expiredCount): void {
                // Gọi dịch vụ hủy cho từng đơn; dịch vụ đảm nhiệm việc khôi phục tồn kho và điểm.
                foreach ($orders as $candidate) {
                    $expired = $cancellations->expirePendingPayment($candidate);

                    // Chỉ tăng bộ đếm nếu dịch vụ xác nhận đơn đã được hủy.
                    if ($expired) {
                        $expiredCount++;
                    }
                }
            }, 'Ma_don_hang');

        // In tổng số đơn đã hủy để theo dõi kết quả của lệnh.
        $this->info("Cancelled {$expiredCount} expired ApiPay order(s).");

        // Trả mã thành công cho Laravel Scheduler hoặc tiến trình gọi lệnh.
        return self::SUCCESS;
    }
}
