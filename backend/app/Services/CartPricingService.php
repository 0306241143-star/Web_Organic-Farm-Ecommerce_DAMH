<?php

/*
 * Tính giá và tồn khả dụng dùng chung cho giỏ hàng và bước tạo đơn.
 */

namespace App\Services;

use App\Models\GioHang;
use App\Models\SanPham;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class CartPricingService
{
    /**
     * Tạo snapshot sản phẩm từ dữ liệu server; có thể khóa tồn khi đặt hàng.
     */
    public function priceCart(GioHang $cart, bool $lockForUpdate = false): array
    {
        $cart->loadMissing('chiTiets.sanPham');
        $cartItems = $cart->chiTiets
            ->filter(fn ($item) => $item->sanPham !== null)
            ->values();
        $productIds = $cartItems->pluck('Ma_san_pham')->map(fn ($id) => (int) $id)->all();
        $requestedQuantities = $cartItems->mapWithKeys(
            fn ($item) => [(int) $item->Ma_san_pham => (float) $item->So_luong]
        );

        if ($productIds === []) {
            return [];
        }

        if ($lockForUpdate) {
            $products = SanPham::query()
                ->whereIn('Ma_san_pham', $productIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('Ma_san_pham');

            foreach ($cartItems as $item) {
                $item->setRelation('sanPham', $products->get($item->Ma_san_pham));
            }
        }

        $stocks = $this->availableStockFor($productIds, $lockForUpdate);

        $saleQuery = DB::table('chi_tiet_flash_sale as ctfs')
            ->join('chuong_trinh_flash_sale as fs', 'fs.Ma_flash_sale', '=', 'ctfs.Ma_flash_sale')
            ->join('lo_hang as lh', 'lh.Ma_lo_hang', '=', 'ctfs.Ma_lo_hang')
            ->join('lo_canh_tac as lct', 'lct.Ma_lo_canh_tac', '=', 'lh.Ma_lo_canh_tac')
            ->join('san_pham as sp', 'sp.Ma_san_pham', '=', 'lct.Ma_san_pham')
            ->whereIn('sp.Ma_san_pham', $productIds)
            ->where('fs.Trang_thai', 'Dang_dien_ra')
            ->where('fs.Thoi_gian_bat_dau', '<=', now())
            ->where('fs.Thoi_gian_ket_thuc', '>=', now())
            ->whereColumn('ctfs.So_luong_da_ban', '<', 'ctfs.So_luong_gioi_han')
            ->where('ctfs.Gia_giam', '>', 0)
            ->whereIn('lh.Trang_thai', ['Con_hang', 'Sap_het_han'])
            ->whereDate('lh.Han_su_dung', '>=', now()->toDateString())
            ->where('lh.So_luong_con_lai', '>', 0)
            ->whereColumn('ctfs.Gia_giam', '<', 'sp.Gia_ban')
            ->orderBy('ctfs.Gia_giam')
            ->select([
                'sp.Ma_san_pham',
                'ctfs.Ma_ct_flash_sale',
                'lh.So_luong_con_lai as flash_sale_batch_stock',
                'ctfs.Gia_giam',
                'ctfs.So_luong_gioi_han',
                'ctfs.So_luong_da_ban',
            ]);

        if ($lockForUpdate) {
            $saleQuery->lockForUpdate();
        }

        $sales = $saleQuery->get()
            ->filter(fn ($sale) => (
                (float) $sale->So_luong_gioi_han - (float) $sale->So_luong_da_ban
            ) >= (float) $requestedQuantities->get((int) $sale->Ma_san_pham, 0))
            ->filter(fn ($sale) => (
                (float) $sale->flash_sale_batch_stock
            ) >= (float) $requestedQuantities->get((int) $sale->Ma_san_pham, 0))
            ->unique('Ma_san_pham')
            ->keyBy('Ma_san_pham');

        return $cartItems->map(function ($item) use ($stocks, $sales): array {
            $product = $item->sanPham;
            $productId = (int) $item->Ma_san_pham;
            $quantity = (float) $item->So_luong;
            $sale = $sales->get($productId);
            $price = (float) ($sale->Gia_giam ?? $product->Gia_ban);
            $stock = (float) $stocks->get($productId, 0);

            return [
                'id' => $productId,
                'product' => $product,
                'quantity' => $quantity,
                'price' => $price,
                'line_total' => round($price * $quantity, 2),
                'available_stock' => $stock,
                'is_available' => $product->Trang_thai === 'Dang_ban' && $stock >= $quantity,
                'flash_sale_detail_id' => $sale?->Ma_ct_flash_sale,
            ];
        })->all();
    }

    public function availableStockFor(array $productIds, bool $lockForUpdate = false): Collection
    {
        if ($productIds === []) {
            return collect();
        }

        $query = DB::table('lo_hang as lh')
            ->join('lo_canh_tac as lct', 'lct.Ma_lo_canh_tac', '=', 'lh.Ma_lo_canh_tac')
            ->whereIn('lct.Ma_san_pham', $productIds)
            ->whereIn('lh.Trang_thai', ['Con_hang', 'Sap_het_han'])
            ->whereDate('lh.Han_su_dung', '>=', now()->toDateString())
            ->where('lh.So_luong_con_lai', '>', 0)
            ->select(['lct.Ma_san_pham', 'lh.So_luong_con_lai']);

        if ($lockForUpdate) {
            $query->lockForUpdate();
        }

        return $query->get()
            ->groupBy('Ma_san_pham')
            ->map(fn (Collection $batches) => (float) $batches->sum('So_luong_con_lai'));
    }
}
