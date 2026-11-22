<?php

/*
 * Hủy đơn và hoàn lại tồn kho, điểm thưởng trong một giao dịch.
 */

namespace App\Services\Order;

use App\Models\DonHang;
use App\Services\RewardPointService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class OrderCancellationService
{
    public function __construct(private RewardPointService $rewards)
    {
    }

    public function cancelOrder(DonHang $order, string $reason): DonHang
    {
        $result = DB::transaction(function () use ($order, $reason): array {
            $userId = (int) $order->Ma_nguoi_dung;
            $this->rewards->lockCustomer($userId);
            $payments = DB::table('thanh_toan')
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->lockForUpdate()
                ->get(['Ma_thanh_toan', 'Trang_thai']);
            $lockedOrder = DonHang::query()
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->where('Ma_nguoi_dung', $userId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($lockedOrder->Trang_thai === 'Da_huy') {
                return [
                    'order' => $lockedOrder,
                    'points_refunded' => 0,
                    'stock_restored' => 0,
                ];
            }

            $hasSuccessfulPayment = $payments->contains(
                fn (object $payment): bool => $payment->Trang_thai === 'Thanh_cong'
            );
            if (
                ! in_array($lockedOrder->Trang_thai, ['Cho_thanh_toan', 'Cho_xac_nhan'], true)
                || $hasSuccessfulPayment
            ) {
                throw ValidationException::withMessages([
                    'order_id' => 'Đơn hàng đã được thanh toán hoặc đang xử lý nên không thể hủy tại đây.',
                ]);
            }

            $stockRestored = $this->restoreAllocatedStock($lockedOrder);
            $lockedOrder->update(['Trang_thai' => 'Da_huy']);
            DB::table('thanh_toan')
                ->whereIn(
                    'Ma_thanh_toan',
                    $payments->where('Trang_thai', 'Khoi_tao')->pluck('Ma_thanh_toan')
                )
                ->update(['Trang_thai' => 'That_bai']);

            $cancelledOrder = $lockedOrder->refresh();
            $pointsRefunded = $this->rewards->refundOrderPoints($cancelledOrder);
            Log::info('Retail order cancelled.', [
                'order_id' => $cancelledOrder->Ma_don_hang,
                'reason' => $reason,
            ]);

            return [
                'order' => $cancelledOrder,
                'points_refunded' => $pointsRefunded,
                'stock_restored' => $stockRestored,
            ];
        });

        return $result['order']
            ->setAttribute('points_refunded', $result['points_refunded'])
            ->setAttribute('stock_restored', $result['stock_restored']);
    }

    private function restoreAllocatedStock(DonHang $order): float
    {
        $allocations = DB::table('phan_bo_lo_hang as allocation')
            ->join('chi_tiet_don_hang as detail', 'detail.Ma_ct_don_hang', '=', 'allocation.Ma_ct_don_hang')
            ->where('detail.Ma_don_hang', $order->Ma_don_hang)
            ->lockForUpdate()
            ->get(['allocation.Ma_lo_hang', 'allocation.So_luong_xuat'])
            ->groupBy('Ma_lo_hang');
        $restored = 0.0;

        foreach ($allocations as $batchId => $items) {
            $batch = DB::table('lo_hang')
                ->where('Ma_lo_hang', $batchId)
                ->lockForUpdate()
                ->first();

            if (! $batch || $batch->Trang_thai === 'Da_huy') {
                continue;
            }

            $quantity = (float) $items->sum('So_luong_xuat');
            DB::table('lo_hang')
                ->where('Ma_lo_hang', $batchId)
                ->increment('So_luong_con_lai', $quantity);

            if (
                $batch->Trang_thai === 'Het_hang'
                && $batch->Han_su_dung >= now()->toDateString()
            ) {
                DB::table('lo_hang')
                    ->where('Ma_lo_hang', $batchId)
                    ->update(['Trang_thai' => 'Con_hang']);
            }

            $restored += $quantity;
        }

        return $restored;
    }
}