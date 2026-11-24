<?php

/*
 * Luồng bán hàng: tạo, xem và bật/tắt chương trình Flash Sale.
 */

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\ChuongTrinhFlashSale;
use App\Models\ChiTietFlashSale;
use App\Services\Catalog\FlashSaleManagementService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class FlashSaleController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:ALL,Sap_dien_ra,Dang_dien_ra,Da_ket_thuc'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $status = $validated['status'] ?? 'ALL';
        $query = ChuongTrinhFlashSale::query();

        if ($status === 'Da_ket_thuc') {
            $query->where(fn ($campaignQuery) => $campaignQuery
                ->where('Trang_thai', 'Da_ket_thuc')
                ->orWhere('Thoi_gian_ket_thuc', '<', now()));
        } elseif ($status === 'Dang_dien_ra') {
            $query->where('Trang_thai', 'Dang_dien_ra')
                ->where('Thoi_gian_bat_dau', '<=', now())
                ->where('Thoi_gian_ket_thuc', '>=', now());
        } elseif ($status === 'Sap_dien_ra') {
            $query->where('Trang_thai', 'Sap_dien_ra')
                ->where('Thoi_gian_ket_thuc', '>=', now());
        }

        $campaigns = $query->with([
                'chiTietFlashSales.loHang.loCanhTac.sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh,Gia_ban',
            ])
            ->orderByDesc('Thoi_gian_bat_dau')
            ->orderByDesc('Ma_flash_sale')
            ->paginate((int) ($validated['per_page'] ?? 10));

        return $this->paginatedResponse(
            $campaigns,
            'Lấy danh sách chương trình Flash Sale thành công.',
            $campaigns->getCollection()->map(fn (ChuongTrinhFlashSale $campaign) => $this->formatCampaign($campaign))->all()
        );
    }

    public function store(Request $request, FlashSaleManagementService $campaigns): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'start_time' => ['required', 'date', 'before_or_equal:now'],
            'end_time' => ['required', 'date', 'after:start_time', 'after:now'],
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.batch_id' => ['required', 'integer', 'min:1', 'distinct'],
            'items.*.sale_price' => ['required', 'numeric', 'gt:0'],
            'items.*.limit_quantity' => ['required', 'numeric', 'gt:0'],
        ]);

        $campaign = $campaigns->create(
            (int) $request->user()->getAuthIdentifier(),
            $validated
        );
        $this->clearCatalogCache();
        $campaign->load('chiTietFlashSales.loHang.loCanhTac.sanPham');

        return $this->successResponse(
            'Tạo chương trình Flash Sale thành công.',
            $this->formatCampaign($campaign),
            201
        );
    }

    public function updateStatus(
        int $campaignId,
        Request $request,
        FlashSaleManagementService $campaigns
    ): JsonResponse {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        $campaign = $campaigns->setEnabled($campaignId, (bool) $validated['enabled']);
        $this->clearCatalogCache();

        return $this->successResponse(
            $validated['enabled']
                ? 'Đã bật chương trình Flash Sale.'
                : 'Đã tắt chương trình Flash Sale.',
            [
                'campaign_id' => (int) $campaign->Ma_flash_sale,
                'status' => $campaign->Trang_thai,
            ]
        );
    }

    private function formatCampaign(ChuongTrinhFlashSale $campaign): array
    {
        $status = $campaign->Trang_thai;
        if ((string) $campaign->Thoi_gian_ket_thuc < now()->toDateTimeString()) {
            $status = 'Da_ket_thuc';
        } elseif ((string) $campaign->Thoi_gian_bat_dau > now()->toDateTimeString()) {
            $status = 'Sap_dien_ra';
        }

        return [
            'campaign_id' => (int) $campaign->Ma_flash_sale,
            'title' => $campaign->Ten_chuong_trinh,
            'start_time' => $campaign->Thoi_gian_bat_dau,
            'end_time' => $campaign->Thoi_gian_ket_thuc,
            'status' => $status,
            'items' => $campaign->chiTietFlashSales->map(function (ChiTietFlashSale $item): array {
                $batch = $item->loHang;
                $product = $batch?->loCanhTac?->sanPham;

                return [
                    'item_id' => (int) $item->Ma_ct_flash_sale,
                    'batch_id' => (int) $item->Ma_lo_hang,
                    'product_name' => $product?->Ten_san_pham ?? 'Sản phẩm đã ngừng kinh doanh',
                    'unit' => $product?->Don_vi_tinh,
                    'regular_price' => (float) ($product?->Gia_ban ?? 0),
                    'sale_price' => (float) $item->Gia_giam,
                    'limit_quantity' => (float) $item->So_luong_gioi_han,
                    'sold_quantity' => (float) $item->So_luong_da_ban,
                    'remaining_quantity' => round(
                        (float) $item->So_luong_gioi_han - (float) $item->So_luong_da_ban,
                        2
                    ),
                    'expiry_date' => $batch?->Han_su_dung,
                ];
            })->all(),
        ];
    }

    private function clearCatalogCache(): void
    {
        Cache::forget('public_catalog_products_v1');
        Cache::forget('public_catalog_products_v2');
        Cache::forget('public_categories_list');
        Cache::forget('public_active_flash_sales_v1');
    }
}
