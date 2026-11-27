<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\ChiTietDonHang;
use App\Models\DonHang;
use App\Models\PhanBoLoHang;
use App\Models\SanPham;
use App\Services\FefoStockService;
use App\Services\RecurringOrderStockService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RecurringStockAlertController extends Controller
{
    use ApiResponse;

    public function index(RecurringOrderStockService $stockAlerts): JsonResponse
    {
        // Gom cảnh báo từ nhiều đơn định kỳ chờ xác nhận theo từng nhóm nhỏ.
        $alerts = [];
        DonHang::query()
            ->where('Loai_don', 'Dinh_ky')
            ->where('Trang_thai', 'Cho_xac_nhan')
            ->with(['khachHang:Ma_nguoi_dung,Ho_ten', 'chiTiets.sanPham', 'chiTiets.phanBoLoHangs'])
            ->chunkById(100, function ($orders) use (&$alerts, $stockAlerts): void {
                foreach ($orders as $order) {
                    // Bỏ qua đơn đủ hàng; chỉ giữ đơn thực sự cần thay sản phẩm hoặc hoãn.
                    $alert = $stockAlerts->alertForOrder($order);
                    if ($alert === null) {
                        continue;
                    }

                    $alerts[] = [
                        'order_id' => (int) $order->Ma_don_hang,
                        'customer_name' => $order->khachHang?->Ho_ten,
                        'stock_alert' => $alert,
                    ];
                }
            }, 'Ma_don_hang');

        return $this->successResponse(
            'Lấy danh sách đơn định kỳ cần xử lý thiếu hàng thành công.',
            $alerts
        );
    }

    public function replacements(
        int $orderId,
        int $detailId,
        RecurringOrderStockService $stockAlerts,
        FefoStockService $stock
    ): JsonResponse {
        // Đảm bảo đơn đang chờ xác nhận thuộc luồng định kỳ trước khi truy vấn dòng hàng.
        $order = $this->eligibleOrder($orderId);
        $detail = ChiTietDonHang::query()
            ->where('Ma_don_hang', $order->Ma_don_hang)
            ->with('sanPham')
            ->findOrFail($detailId);
        $shortage = collect($stockAlerts->shortagesForOrder($order))
            ->firstWhere('detail_id', $detailId);

        if ($shortage === null) {
            throw ValidationException::withMessages([
                'detail_id' => 'Sản phẩm này hiện không thiếu hàng.',
            ]);
        }

        // Chỉ gợi ý sản phẩm đang bán, cùng đơn vị và còn tồn kho đến hạn hợp lệ.
        $products = SanPham::query()
            ->where('san_pham.Trang_thai', 'Dang_ban')
            ->where('san_pham.Don_vi_tinh', $detail->sanPham?->Don_vi_tinh)
            ->where('san_pham.Ma_san_pham', '!=', $detail->Ma_san_pham)
            ->whereHas('loHangs', fn ($query) => $query
                ->whereIn('lo_hang.Trang_thai', ['Con_hang', 'Sap_het_han'])
                ->where('lo_hang.So_luong_con_lai', '>', 0)
                ->whereDate('lo_hang.Han_su_dung', '>=', now()->toDateString()))
            ->orderBy('san_pham.Ten_san_pham')
            ->get(['Ma_san_pham', 'Ten_san_pham', 'Don_vi_tinh'])
            ->map(fn (SanPham $product): array => [
                'product_id' => (int) $product->Ma_san_pham,
                'name' => $product->Ten_san_pham,
                'unit' => $product->Don_vi_tinh,
                'available_quantity' => $stock->availableQuantity((int) $product->Ma_san_pham),
            ])
            ->filter(fn (array $product): bool => $product['available_quantity'] >= (float) $detail->So_luong)
            ->take(10)
            ->values()
            ->all();

        return $this->successResponse('Lấy sản phẩm thay thế phù hợp thành công.', $products);
    }

    public function replace(
        int $orderId,
        Request $request,
        RecurringOrderStockService $stockAlerts,
        FefoStockService $stock
    ): JsonResponse {
        // Chặn dữ liệu dòng thay thế sai trước khi mở transaction ghi dữ liệu.
        $validated = $request->validate([
            'detail_id' => ['required', 'integer', 'min:1'],
            'product_id' => ['required', 'integer', 'min:1'],
        ]);

        // Khóa và cập nhật đơn, dòng hàng và phân bổ lô trong cùng một transaction.
        $order = DB::transaction(function () use ($orderId, $validated, $stockAlerts, $stock): DonHang {
            $order = $this->eligibleOrder($orderId, true);
            $detail = ChiTietDonHang::query()
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->lockForUpdate()
                ->with('sanPham')
                ->findOrFail($validated['detail_id']);
            $shortage = collect($stockAlerts->shortagesForOrder($order))
                ->firstWhere('detail_id', (int) $detail->Ma_ct_don_hang);

            if ($shortage === null) {
                throw ValidationException::withMessages([
                    'detail_id' => 'Sản phẩm này hiện không thiếu hàng.',
                ]);
            }

            if (PhanBoLoHang::query()->where('Ma_ct_don_hang', $detail->Ma_ct_don_hang)->exists()) {
                throw ValidationException::withMessages([
                    'detail_id' => 'Không thể thay thế sản phẩm đã được phân bổ lô hàng.',
                ]);
            }

            $replacement = SanPham::query()
                ->whereKey($validated['product_id'])
                ->where('Trang_thai', 'Dang_ban')
                ->where('Don_vi_tinh', $detail->sanPham?->Don_vi_tinh)
                ->firstOrFail();
            $quantity = (float) $detail->So_luong;

            if ($stock->availableQuantity((int) $replacement->Ma_san_pham, true) < $quantity) {
                throw ValidationException::withMessages([
                    'product_id' => 'Sản phẩm thay thế không còn đủ số lượng trong kho.',
                ]);
            }

            $detail->update(['Ma_san_pham' => $replacement->Ma_san_pham]);
            foreach ($stock->allocateBatches((int) $replacement->Ma_san_pham, $quantity) as $allocation) {
                PhanBoLoHang::query()->create([
                    'Ma_ct_don_hang' => $detail->Ma_ct_don_hang,
                    'Ma_lo_hang' => $allocation['batch_id'],
                    'So_luong_xuat' => $allocation['quantity'],
                ]);
            }

            return $order->refresh();
        });

        $order->load(['chiTiets.sanPham', 'chiTiets.phanBoLoHangs']);

        return $this->successResponse('Đã thay thế sản phẩm và phân bổ lô FEFO.', [
            'order_id' => (int) $order->Ma_don_hang,
            'resolved' => $stockAlerts->shortagesForOrder($order) === [],
        ]);
    }

    public function postpone(int $orderId, RecurringOrderStockService $stockAlerts): JsonResponse
    {
        // Hoãn trong transaction để tái kiểm tra thiếu hàng và tránh thay đổi đồng thời.
        $deliveryDate = DB::transaction(function () use ($orderId, $stockAlerts) {
            $order = $this->eligibleOrder($orderId, true);
            if ($stockAlerts->shortagesForOrder($order) === []) {
                throw ValidationException::withMessages([
                    'order_id' => 'Đơn hàng hiện không còn thiếu hàng để hoãn.',
                ]);
            }

            return $stockAlerts->postpone($order);
        });

        return $this->successResponse('Đã hoãn đơn định kỳ sang kỳ giao tuần sau.', [
            'order_id' => $orderId,
            'scheduled_delivery_at' => $deliveryDate->toDateString(),
        ]);
    }

    private function eligibleOrder(int $orderId, bool $lock = false): DonHang
    {
        // Tùy chọn khóa bản ghi đơn để các thao tác thay thế hoặc hoãn không chạy chồng nhau.
        $order = DonHang::query()
            ->whereKey($orderId)
            ->when($lock, fn ($query) => $query->lockForUpdate())
            ->with(['chiTiets.sanPham', 'chiTiets.phanBoLoHangs'])
            ->firstOrFail();

        if ($order->Loai_don !== 'Dinh_ky' || $order->Trang_thai !== 'Cho_xac_nhan') {
            throw ValidationException::withMessages([
                'order_id' => 'Chỉ xử lý thiếu hàng cho đơn định kỳ đang chờ xác nhận.',
            ]);
        }

        return $order;
    }
}
