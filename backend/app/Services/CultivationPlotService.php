<?php

namespace App\Services;

use App\Models\LoCanhTac;
use Illuminate\Support\Facades\DB;

class CultivationPlotService
{
    public function findLinkedBatchReason(iterable $batches): ?string
    {
        foreach ($batches as $batch) {
            $batchId = $batch->Ma_lo_hang;
            if (DB::table('phan_bo_lo_hang')->where('Ma_lo_hang', $batchId)->exists()) {
                return 'lô hàng thu hoạch đã được phân bổ xuất kho (FEFO) cho đơn hàng của khách';
            }
            if (DB::table('chi_tiet_flash_sale')->where('Ma_lo_hang', $batchId)->exists()) {
                return 'lô hàng thu hoạch đang được áp dụng trong chương trình Flash Sale';
            }
            if (DB::table('bien_dong_kho')->where('Ma_lo_hang', $batchId)->exists()) {
                return 'lô hàng thu hoạch đã có phiếu ghi nhận hao hụt / biến động kho';
            }
        }

        return null;
    }

    public function deletePlotCascade(LoCanhTac $plot): void
    {
        DB::transaction(function () use ($plot): void {
            foreach ($plot->nhatKyCanhTacs as $log) {
                $log->tepNhatKys()->delete();
                $log->delete();
            }
            foreach ($plot->loHangs as $batch) {
                $batch->maQrTruyXuat()->delete();
                $batch->bienDongKhos()->delete();
                // Preserve product-level certificates while removing plot-only certificates.
                $batch->chungNhans()->whereNotNull('Ma_san_pham')->update(['Ma_lo_hang' => null]);
                $batch->chungNhans()->whereNull('Ma_san_pham')->delete();
                $batch->delete();
            }
            $plot->delete();
        });
    }
}
