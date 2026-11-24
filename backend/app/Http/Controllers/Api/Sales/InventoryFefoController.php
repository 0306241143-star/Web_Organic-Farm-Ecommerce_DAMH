<?php

/*
 * Luồng bán hàng: theo dõi tồn kho theo FEFO và cảnh báo lô cận hạn.
 */

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\LoHang;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryFefoController extends Controller
{
    use ApiResponse;

    private const EXPIRY_WARNING_DAYS = 2;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:ALL,Con_hang,Sap_het_han,Het_hang,Da_huy'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = $this->inventoryQuery($validated);
        $batches = $query
            ->orderBy('Han_su_dung')
            ->orderBy('Ma_lo_hang')
            ->paginate((int) ($validated['per_page'] ?? 10));

        return $this->paginatedResponse(
            $batches,
            'Lấy danh sách tồn kho theo FEFO thành công.',
            $batches->getCollection()->map(fn (LoHang $batch) => $this->formatBatch($batch))->all()
        );
    }

    public function expiringBatches(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $lastWarningDate = now()->addDays(self::EXPIRY_WARNING_DAYS)->toDateString();
        $batches = $this->baseQuery()
            ->whereIn('Trang_thai', ['Con_hang', 'Sap_het_han'])
            ->where('So_luong_con_lai', '>', 0)
            ->whereDate('Han_su_dung', '>=', now()->toDateString())
            ->whereDate('Han_su_dung', '<=', $lastWarningDate)
            ->orderBy('Han_su_dung')
            ->orderBy('Ma_lo_hang')
            ->paginate((int) ($validated['per_page'] ?? 10));

        return $this->paginatedResponse(
            $batches,
            'Lấy danh sách lô sắp hết hạn thành công.',
            $batches->getCollection()->map(fn (LoHang $batch) => $this->formatBatch($batch))->all()
        );
    }

    private function inventoryQuery(array $filters)
    {
        return $this->baseQuery()
            ->when(
                ($filters['status'] ?? 'ALL') !== 'ALL',
                fn ($query) => $query->where('Trang_thai', $filters['status'])
            )
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($batchQuery) use ($search): void {
                    if (ctype_digit($search)) {
                        $batchQuery->where('Ma_lo_hang', (int) $search);
                    }

                    $batchQuery->orWhereHas('loCanhTac.sanPham', fn ($productQuery) => $productQuery
                        ->where('Ten_san_pham', 'like', "%{$search}%"));
                });
            });
    }

    private function baseQuery()
    {
        return LoHang::query()->with([
            'loCanhTac.sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh,Gia_ban,Hinh_anh_dai_dien',
        ]);
    }

    private function formatBatch(LoHang $batch): array
    {
        $expiryDate = Carbon::parse($batch->Han_su_dung)->startOfDay();
        $daysUntilExpiry = (int) Carbon::today()->diffInDays($expiryDate, false);
        $product = $batch->loCanhTac?->sanPham;

        return [
            'batch_id' => (int) $batch->Ma_lo_hang,
            'product_id' => $product ? (int) $product->Ma_san_pham : null,
            'product_name' => $product?->Ten_san_pham ?? 'Sản phẩm đã ngừng kinh doanh',
            'product_image' => $product?->Hinh_anh_dai_dien,
            'unit' => $product?->Don_vi_tinh,
            'regular_price' => (float) ($product?->Gia_ban ?? 0),
            'plot_name' => $batch->loCanhTac?->Ten_lo,
            'harvest_date' => $batch->Ngay_thu_hoach,
            'expiry_date' => $batch->Han_su_dung,
            'days_until_expiry' => $daysUntilExpiry,
            'initial_quantity' => (float) $batch->So_luong_thu_hoach,
            'remaining_quantity' => (float) $batch->So_luong_con_lai,
            'status' => $batch->Trang_thai,
            'is_expiring_soon' => $daysUntilExpiry >= 0
                && $daysUntilExpiry <= self::EXPIRY_WARNING_DAYS
                && (float) $batch->So_luong_con_lai > 0,
        ];
    }
}
