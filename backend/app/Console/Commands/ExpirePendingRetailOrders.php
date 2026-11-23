<?php

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
        $timeoutMinutes = max(
            1,
            (int) config('services.checkout.pending_payment_timeout_minutes', 30)
        );
        $deadline = now()->subMinutes($timeoutMinutes);
        $expiredCount = 0;

        DonHang::query()
            ->where('Trang_thai', 'Cho_thanh_toan')
            ->where('created_at', '<=', $deadline)
            ->whereExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('thanh_toan')
                    ->whereColumn('thanh_toan.Ma_don_hang', 'don_hang.Ma_don_hang')
                    ->where('thanh_toan.Phuong_thuc', 'ApiPay')
                    ->where('thanh_toan.Trang_thai', 'Khoi_tao');
            })
            ->orderBy('Ma_don_hang')
            ->chunkById(100, function ($orders) use ($cancellations, &$expiredCount): void {
                foreach ($orders as $candidate) {
                    $expired = $cancellations->expirePendingPayment($candidate);

                    if ($expired) {
                        $expiredCount++;
                    }
                }
            }, 'Ma_don_hang');

        $this->info("Cancelled {$expiredCount} expired ApiPay order(s).");

        return self::SUCCESS;
    }
}
