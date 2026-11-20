<?php

namespace App\Console\Commands;

use App\Models\DonHang;
use App\Services\RewardPointService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpirePendingRetailOrders extends Command
{
    protected $signature = 'orders:expire-pending-payments';

    protected $description = 'Cancel overdue ApiPay orders and refund any redeemed reward points.';

    public function handle(RewardPointService $rewards): int
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
            ->chunkById(100, function ($orders) use ($rewards, &$expiredCount): void {
                foreach ($orders as $candidate) {
                    $expired = DB::transaction(function () use ($candidate, $rewards): bool {
                        $rewards->lockCustomer((int) $candidate->Ma_nguoi_dung);
                        $pendingPayment = DB::table('thanh_toan')
                            ->where('Ma_don_hang', $candidate->Ma_don_hang)
                            ->where('Phuong_thuc', 'ApiPay')
                            ->where('Trang_thai', 'Khoi_tao')
                            ->lockForUpdate()
                            ->first();
                        if (! $pendingPayment) {
                            return false;
                        }

                        $order = DonHang::query()
                            ->whereKey($candidate->Ma_don_hang)
                            ->lockForUpdate()
                            ->first();

                        if (! $order || $order->Trang_thai !== 'Cho_thanh_toan') {
                            return false;
                        }

                        $order->update(['Trang_thai' => 'Da_huy']);
                        DB::table('thanh_toan')
                            ->where('Ma_thanh_toan', $pendingPayment->Ma_thanh_toan)
                            ->where('Trang_thai', 'Khoi_tao')
                            ->update(['Trang_thai' => 'That_bai']);
                        $rewards->refundOrderPoints($order);

                        return true;
                    });

                    if ($expired) {
                        $expiredCount++;
                    }
                }
            }, 'Ma_don_hang');

        $this->info("Cancelled {$expiredCount} expired ApiPay order(s).");

        return self::SUCCESS;
    }
}
