<?php

/*
 * Dịch vụ chọn lô có hạn sử dụng gần nhất và trừ tồn kho tự động theo FEFO.
 */

namespace App\Services;

use App\Models\LoHang;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FefoStockService
{
    /**
     * @return array<int, array{batch_id: int, quantity: float}>
     */
    public function allocateBatches(int $productId, float $quantity): array
    {
        if ($quantity <= 0 || ! is_finite($quantity)) {
            throw ValidationException::withMessages([
                'cart' => 'Số lượng cần xuất kho không hợp lệ.',
            ]);
        }

        return DB::transaction(function () use ($productId, $quantity): array {
            $remaining = round($quantity, 2);
            $allocations = [];
            $batches = LoHang::query()
                ->whereHas('loCanhTac', fn ($query) => $query->where('Ma_san_pham', $productId))
                ->whereIn('Trang_thai', ['Con_hang', 'Sap_het_han'])
                ->where('So_luong_con_lai', '>', 0)
                ->whereDate('Han_su_dung', '>=', now()->toDateString())
                ->orderBy('Han_su_dung', 'asc')
                ->orderBy('Ma_lo_hang', 'asc')
                ->lockForUpdate()
                ->get();

            foreach ($batches as $batch) {
                if ($remaining <= 0) {
                    break;
                }

                $available = (float) $batch->So_luong_con_lai;
                $allocated = min($available, $remaining);
                $newRemaining = round($available - $allocated, 2);

                $batch->So_luong_con_lai = $newRemaining;
                if ($newRemaining <= 0) {
                    $batch->Trang_thai = 'Het_hang';
                }
                $batch->save();

                $allocations[] = [
                    'batch_id' => (int) $batch->Ma_lo_hang,
                    'quantity' => $allocated,
                ];
                $remaining = round($remaining - $allocated, 2);
            }

            if ($remaining > 0) {
                throw ValidationException::withMessages([
                    'cart' => 'Sản phẩm không còn đủ số lượng trong kho. Hãy cập nhật giỏ hàng.',
                ]);
            }

            return $allocations;
        });
    }
}
