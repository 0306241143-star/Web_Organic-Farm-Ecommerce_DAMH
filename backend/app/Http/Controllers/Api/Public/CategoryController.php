<?php

/*
 * Luồng công khai: cung cấp danh sách danh mục nông sản kèm thống kê sản phẩm đang bán.
 */

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\DanhMuc;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    use ApiResponse;

    /**
     * Lấy danh sách toàn bộ danh mục nông sản cùng số lượng sản phẩm đang mở bán và khoảng giá thực tế.
     */
    public function index(): JsonResponse
    {
        $categories = Cache::remember('public_categories_list', 120, function () {
            return DanhMuc::query()
                ->with([
                    'sanPhams' => function ($query) {
                        $query->where('Trang_thai', 'Dang_ban')
                            ->select(['Ma_san_pham', 'Ma_danh_muc', 'Gia_ban', 'Trang_thai'])
                            ->with([
                                'loCanhTacs:Ma_lo_canh_tac,Ma_san_pham',
                                'loCanhTacs.loHangs' => function ($batchQuery) {
                                    $batchQuery->whereIn('Trang_thai', ['Con_hang', 'Sap_het_han'])
                                        ->where('So_luong_con_lai', '>', 0)
                                        ->whereDate('Han_su_dung', '>=', now()->toDateString())
                                        ->select(['Ma_lo_hang', 'Ma_lo_canh_tac', 'So_luong_con_lai', 'Trang_thai']);
                                },
                            ]);
                    },
                ])
                ->orderBy('Ma_danh_muc', 'asc')
                ->get()
                ->map(function (DanhMuc $category): array {
                    $activeProducts = $category->sanPhams;
                    $inStockCount = $activeProducts->filter(function ($product): bool {
                        $stock = $product->loCanhTacs
                            ->flatMap(fn($plot) => $plot->loHangs)
                            ->sum(fn($batch) => (float) $batch->So_luong_con_lai);

                        return $stock > 0;
                    })->count();

                    $prices = $activeProducts
                        ->pluck('Gia_ban')
                        ->map(fn($price) => (float) $price)
                        ->values();

                    return [
                        'id'                     => (int) $category->Ma_danh_muc,
                        'name'                   => $category->Ten_danh_muc,
                        'description'            => $category->Mo_ta,
                        'product_count'          => $activeProducts->count(),
                        'products_count'         => $activeProducts->count(),
                        'in_stock_product_count' => $inStockCount,
                        'min_price'              => $prices->isNotEmpty() ? $prices->min() : null,
                        'max_price'              => $prices->isNotEmpty() ? $prices->max() : null,
                    ];
                })
                ->values();
        });

        return $this->successResponse(
            message: 'Lấy danh sách danh mục nông sản thành công.',
            data: $categories
        );
    }
}
