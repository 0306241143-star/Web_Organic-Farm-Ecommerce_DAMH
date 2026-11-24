<?php

/*
 * Tạo chương trình khuyến mãi có quota theo lô hàng và bảo vệ tồn kho khả dụng.
 */

namespace App\Services\Catalog;

use App\Models\ChuongTrinhFlashSale;
use App\Models\ChiTietFlashSale;
use App\Models\LoHang;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FlashSaleManagementService
{
    public function create(int $staffId, array $validated): ChuongTrinhFlashSale
    {
        return DB::transaction(function () use ($staffId, $validated): ChuongTrinhFlashSale {
            $start = Carbon::parse($validated['start_time']);
            $end = Carbon::parse($validated['end_time']);
            $items = collect($validated['items']);
            $batchIds = $items->pluck('batch_id')->map(fn ($id) => (int) $id)->all();

            $batches = LoHang::query()
                ->whereIn('Ma_lo_hang', $batchIds)
                ->with('loCanhTac.sanPham')
                ->lockForUpdate()
                ->get()
                ->keyBy('Ma_lo_hang');

            if ($batches->count() !== count($batchIds)) {
                throw ValidationException::withMessages([
                    'items' => 'Một hoặc nhiều lô hàng không còn tồn tại.',
                ]);
            }

            $conflictingBatch = ChiTietFlashSale::query()
                ->whereIn('Ma_lo_hang', $batchIds)
                ->whereHas('flashSale', fn ($query) => $query
                    ->where('Trang_thai', '!=', 'Da_ket_thuc')
                    ->where('Thoi_gian_bat_dau', '<', $end)
                    ->where('Thoi_gian_ket_thuc', '>', $start))
                ->exists();

            if ($conflictingBatch) {
                throw ValidationException::withMessages([
                    'items' => 'Lô hàng đã thuộc một chương trình Flash Sale có thời gian giao nhau.',
                ]);
            }

            foreach ($items as $item) {
                $batch = $batches->get((int) $item['batch_id']);
                $product = $batch->loCanhTac?->sanPham;
                $stock = (float) $batch->So_luong_con_lai;
                $lastWarningDate = now()->addDays(2)->toDateString();

                if (
                    ! $product
                    || ! in_array($batch->Trang_thai, ['Con_hang', 'Sap_het_han'], true)
                    || $stock <= 0
                    || $batch->Han_su_dung < now()->toDateString()
                    || $batch->Han_su_dung > $lastWarningDate
                    || $batch->Han_su_dung < $end->toDateString()
                ) {
                    throw ValidationException::withMessages([
                        'items' => "Lô hàng #{$batch->Ma_lo_hang} phải còn hàng và sắp hết hạn trong 2 ngày tới.",
                    ]);
                }

                if ((float) $item['sale_price'] >= (float) $product->Gia_ban) {
                    throw ValidationException::withMessages([
                        'items' => "Giá Flash Sale của sản phẩm {$product->Ten_san_pham} phải thấp hơn giá bán hiện tại.",
                    ]);
                }

                if ((float) $item['limit_quantity'] > $stock) {
                    throw ValidationException::withMessages([
                        'items' => "Số lượng Flash Sale của lô #{$batch->Ma_lo_hang} vượt quá tồn kho khả dụng.",
                    ]);
                }
            }

            $campaign = ChuongTrinhFlashSale::query()->create([
                'Ma_sales_tao' => $staffId,
                'Ten_chuong_trinh' => $validated['title'],
                'Thoi_gian_bat_dau' => $start,
                'Thoi_gian_ket_thuc' => $end,
                'Trang_thai' => 'Dang_dien_ra',
            ]);

            foreach ($items as $item) {
                ChiTietFlashSale::query()->create([
                    'Ma_flash_sale' => $campaign->Ma_flash_sale,
                    'Ma_lo_hang' => (int) $item['batch_id'],
                    'Gia_giam' => $item['sale_price'],
                    'So_luong_gioi_han' => $item['limit_quantity'],
                    'So_luong_da_ban' => 0,
                ]);
            }

            return $campaign;
        });
    }

    public function setEnabled(int $campaignId, bool $enabled): ChuongTrinhFlashSale
    {
        return DB::transaction(function () use ($campaignId, $enabled): ChuongTrinhFlashSale {
            $campaign = ChuongTrinhFlashSale::query()
                ->whereKey($campaignId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($enabled) {
                if (
                    $campaign->Thoi_gian_bat_dau > now()
                    || $campaign->Thoi_gian_ket_thuc <= now()
                ) {
                    throw ValidationException::withMessages([
                        'enabled' => 'Chỉ bật chương trình trong khoảng thời gian còn hiệu lực.',
                    ]);
                }

                $campaign->Trang_thai = 'Dang_dien_ra';
            } else {
                $campaign->Trang_thai = $campaign->Thoi_gian_ket_thuc <= now()
                    ? 'Da_ket_thuc'
                    : 'Sap_dien_ra';
            }

            $campaign->save();

            return $campaign;
        });
    }
}
