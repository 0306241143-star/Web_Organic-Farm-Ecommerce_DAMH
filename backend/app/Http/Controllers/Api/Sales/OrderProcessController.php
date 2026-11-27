<?php

/*
 * Luồng bán hàng: lọc, phê duyệt và thu tiền COD cho đơn hàng.
 */

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\DonHang;
use App\Models\PhanBoLoHang;
use App\Models\ThanhToan;
use App\Services\Order\SalesOrderProcessingService;
use App\Services\RecurringOrderStockService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderProcessController extends Controller
{
    use ApiResponse;

    public function __construct(private RecurringOrderStockService $recurringStock) {}

    public function index(Request $request): JsonResponse
    {
        // Kiểm tra bộ lọc trạng thái, thanh toán, mã đơn và phân trang.
        $validated = $request->validate([
            'status' => ['nullable', 'in:Cho_thanh_toan,Cho_xac_nhan,Da_xac_nhan,Dang_giao,Hoan_thanh,Da_huy'],
            'payment_method' => ['nullable', 'in:ApiPay,COD,Mien_phi_goi,Giao_bu'],
            'order_id' => ['nullable', 'integer', 'min:1'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $orders = DonHang::query()
            ->when(
                $validated['status'] ?? null,
                fn ($query, string $status) => $query->where('Trang_thai', $status)
            )
            ->when(
                $validated['payment_method'] ?? null,
                fn ($query, string $method) => $query->whereHas(
                    'thanhToans',
                    fn ($paymentQuery) => $paymentQuery->where('Phuong_thuc', $method)
                )
            )
            ->when(
                $validated['order_id'] ?? null,
                fn ($query, int $orderId) => $query->where('Ma_don_hang', $orderId)
            )
            ->with([
                'khachHang:Ma_nguoi_dung,Ho_ten,Email,So_dien_thoai',
                'diaChi',
                'chiTiets.sanPham:Ma_san_pham,Ten_san_pham,Hinh_anh_dai_dien,Don_vi_tinh,Gia_ban',
                'chiTiets.phanBoLoHangs.loHang:Ma_lo_hang,Han_su_dung',
                'thanhToans',
                'giaoHang.nhanVienDieuPhoi:Ma_nguoi_dung,Ho_ten',
                'dangKyGoi.goi:Ma_goi,Ten_goi,Gia_goi,Ky_han_thang',
            ])
            ->orderByDesc('Ngay_dat')
            ->orderByDesc('Ma_don_hang')
            ->paginate((int) ($validated['per_page'] ?? 10));

        return $this->paginatedResponse(
            $orders,
            'Lấy danh sách đơn hàng thành công.',
            $orders->getCollection()->map(fn (DonHang $order) => $this->formatOrder($order))->all()
        );
    }

    public function show(int $orderId): JsonResponse
    {
        $order = DonHang::query()
            ->whereKey($orderId)
            ->with([
                'khachHang:Ma_nguoi_dung,Ho_ten,Email,So_dien_thoai',
                'diaChi',
                'chiTiets.sanPham:Ma_san_pham,Ten_san_pham,Hinh_anh_dai_dien,Don_vi_tinh,Gia_ban',
                'chiTiets.phanBoLoHangs.loHang:Ma_lo_hang,Han_su_dung',
                'thanhToans',
                'giaoHang.nhanVienDieuPhoi:Ma_nguoi_dung,Ho_ten',
                'dangKyGoi.goi:Ma_goi,Ten_goi,Gia_goi,Ky_han_thang',
            ])
            ->firstOrFail();

        return $this->successResponse(
            'Lấy chi tiết đơn hàng Sales thành công.',
            $this->formatOrder($order)
        );
    }

    public function confirm(int $orderId, Request $request, SalesOrderProcessingService $orders): JsonResponse
    {
        $order = $orders->confirmOrder($orderId, (int) $request->user()->getAuthIdentifier());

        return $this->successResponse(
            'Phê duyệt đơn hàng thành công.',
            ['order_id' => (int) $order->Ma_don_hang, 'status' => $order->Trang_thai]
        );
    }

    public function confirmCodPayment(
        int $orderId,
        SalesOrderProcessingService $orders
    ): JsonResponse {
        $order = $orders->confirmCodCollection($orderId);

        return $this->successResponse(
            'Xác nhận đã thu tiền COD thành công.',
            ['order_id' => (int) $order->Ma_don_hang, 'payment_status' => 'Thanh_cong']
        );
    }

    private function formatOrder(DonHang $order): array
    {
        $address = $order->diaChi;
        $payments = $order->thanhToans;
        $registration = $order->dangKyGoi;
        $scheduledDelivery = $this->recurringStock->availableDeliveryDate($order);
        $stockAlert = $order->Loai_don === 'Dinh_ky'
            && $order->Trang_thai === 'Cho_xac_nhan'
                ? $this->recurringStock->alertForOrder($order)
                : null;

        // Lấy đơn giá gốc từ đơn hàng gốc nếu là đơn giao bù
        $originalItemPrices = [];
        $originalOrderSummary = null;
        if ($order->Ma_don_goc !== null) {
            $originalOrder = DonHang::query()
                ->whereKey($order->Ma_don_goc)
                ->with('chiTiets:Ma_don_hang,Ma_san_pham,Don_gia')
                ->first();

            if ($originalOrder) {
                $originalOrderSummary = [
                    'order_id' => (int) $originalOrder->Ma_don_hang,
                    'total' => (float) $originalOrder->Tong_tien,
                ];
                foreach ($originalOrder->chiTiets as $origItem) {
                    $originalItemPrices[(int) $origItem->Ma_san_pham] = (float) $origItem->Don_gia;
                }
            }
        }

        $items = $order->chiTiets->map(function ($item) use ($originalItemPrices) {
            $productId = (int) $item->Ma_san_pham;
            $qty = (float) $item->So_luong;
            $unitPrice = (float) $item->Don_gia;
            $refUnitPrice = $unitPrice > 0
                ? $unitPrice
                : ($originalItemPrices[$productId] ?? (float) ($item->sanPham?->Gia_ban ?? 0));

            return [
                'product_id' => $productId,
                'name' => $item->sanPham?->Ten_san_pham ?? 'Sản phẩm đã ngừng kinh doanh',
                'image' => $item->sanPham?->Hinh_anh_dai_dien,
                'unit' => $item->sanPham?->Don_vi_tinh,
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'line_total' => (float) $item->Thanh_tien,
                'reference_unit_price' => $refUnitPrice,
                'reference_line_total' => round($refUnitPrice * $qty, 2),
                'allocations' => $item->phanBoLoHangs->map(fn (PhanBoLoHang $allocation) => [
                    'batch_id' => (int) $allocation->Ma_lo_hang,
                    'expiry_date' => $allocation->loHang?->Han_su_dung,
                    'quantity' => (float) $allocation->So_luong_xuat,
                ])->all(),
            ];
        })->all();

        $referenceSubtotal = array_reduce(
            $items,
            fn (float $sum, array $row) => $sum + $row['reference_line_total'],
            0.0
        );

        return [
            'order_id' => (int) $order->Ma_don_hang,
            'order_type' => $order->Loai_don,
            'status' => $order->Trang_thai,
            'ordered_at' => $order->Ngay_dat,
            'scheduled_delivery_at' => $scheduledDelivery?->toDateString(),
            'customer' => [
                'name' => $order->khachHang?->Ho_ten,
                'email' => $order->khachHang?->Email,
                'phone' => $order->khachHang?->So_dien_thoai,
            ],
            'address' => $address ? [
                'recipient_name' => $address->Ten_nguoi_nhan,
                'phone' => $address->So_dien_thoai_nguoi_nhan,
                'detail' => implode(', ', array_filter([
                    $address->Dia_chi_chi_tiet,
                    $address->Phuong_xa,
                    $address->Tinh_thanh,
                ])),
            ] : null,
            'subtotal' => (float) $order->Tien_hang,
            'reference_subtotal' => round($referenceSubtotal, 2),
            'distance_km' => (float) $order->Khoang_cach_km,
            'shipping_fee' => (float) $order->Phi_giao_hang,
            'points_used' => (int) $order->So_diem_su_dung,
            'points_discount' => (float) $order->Tien_giam_tu_diem,
            'total' => (float) $order->Tong_tien,
            'note' => $this->recurringStock->visibleNote($order->Ghi_chu),
            'stock_alert' => $stockAlert,
            'items' => $items,
            'payments' => $payments->map(fn (ThanhToan $payment) => [
                'method' => $payment->Phuong_thuc,
                'status' => $payment->Trang_thai,
                'amount' => (float) $payment->So_tien,
                'paid_at' => $payment->Thoi_gian_thanh_toan,
            ])->all(),
            'delivery' => $order->giaoHang ? [
                'delivery_id' => (int) $order->giaoHang->Ma_giao_hang,
                'carrier' => $order->giaoHang->Don_vi_van_chuyen,
                'tracking_number' => $order->giaoHang->Ma_van_don,
                'status' => $order->giaoHang->Trang_thai,
                'shipped_at' => $order->giaoHang->Ngay_xuat_giao,
                'delivered_at' => $order->giaoHang->Ngay_giao_thanh_cong,
                'dispatcher_name' => $order->giaoHang->nhanVienDieuPhoi?->Ho_ten,
            ] : null,
            'original_order_id' => $order->Ma_don_goc === null ? null : (int) $order->Ma_don_goc,
            'original_order' => $originalOrderSummary,
            'subscription' => $registration ? [
                'subscription_id' => (int) $registration->Ma_dang_ky,
                'package_name' => $registration->goi?->Ten_goi,
                'package_price' => (float) ($registration->goi?->Gia_goi ?? 0),
                'duration_months' => (int) ($registration->goi?->Ky_han_thang ?? 0),
            ] : null,
            'complaint_history' => $this->formatComplaintHistory($order),
            'can_confirm' => $order->Trang_thai === 'Cho_xac_nhan' && $stockAlert === null,
            'can_dispatch' => in_array($order->Trang_thai, ['Da_xac_nhan', 'Dang_giao'], true),
            'can_confirm_cod_collection' => in_array(
                $order->Trang_thai,
                ['Da_xac_nhan', 'Dang_giao', 'Hoan_thanh'],
                true
            ) && $payments->contains(
                fn (ThanhToan $payment) => $payment->Phuong_thuc === 'COD'
                    && $payment->Trang_thai === 'Khoi_tao'
            ),
        ];
    }

    private function formatComplaintHistory(DonHang $order): array
    {
        return DB::table('khieu_nai as claim')
            ->leftJoin('hoan_tien as refund', 'refund.Ma_khieu_nai', '=', 'claim.Ma_khieu_nai')
            ->leftJoin('nguoi_dung as staff', 'staff.Ma_nguoi_dung', '=', 'claim.Ma_nhan_vien_xu_ly')
            ->leftJoin('don_hang as replacement', function ($join): void {
                $join->on('replacement.Ma_khieu_nai', '=', 'claim.Ma_khieu_nai')
                    ->on('replacement.Ma_don_goc', '=', 'claim.Ma_don_hang')
                    ->where('replacement.Loai_don', '=', 'Giao_bu');
            })
            ->where(function ($query) use ($order): void {
                $query->where('claim.Ma_don_hang', $order->Ma_don_hang)
                    ->orWhere('replacement.Ma_don_hang', $order->Ma_don_hang);

                if ($order->Ma_khieu_nai !== null) {
                    $query->orWhere('claim.Ma_khieu_nai', $order->Ma_khieu_nai);
                }
            })
            ->orderByDesc('claim.Ma_khieu_nai')
            ->get([
                'claim.Ma_khieu_nai',
                'claim.Ma_don_hang',
                'replacement.Ma_don_hang as Ma_don_giao_bu',
                'claim.Ly_do',
                'claim.Trang_thai',
                'claim.Hinh_thuc_xu_ly',
                'refund.So_tien as So_tien_hoan',
                'claim.Ngay_xu_ly',
                'refund.Trang_thai as refund_status',
                'staff.Ho_ten as handler_name',
            ])
            ->map(fn (object $claim): array => [
                'claim_id' => (int) $claim->Ma_khieu_nai,
                'original_order_id' => (int) $claim->Ma_don_hang,
                'replacement_order_id' => $claim->Ma_don_giao_bu === null
                    ? null
                    : (int) $claim->Ma_don_giao_bu,
                'reason' => $claim->Ly_do,
                'status' => $claim->Trang_thai,
                'resolution' => $claim->Hinh_thuc_xu_ly,
                'refund_amount' => $claim->So_tien_hoan === null
                    ? null
                    : (float) $claim->So_tien_hoan,
                'refund_status' => $claim->refund_status,
                'feedback' => null,
                'handler' => $claim->handler_name,
                'resolved_at' => $claim->Ngay_xu_ly,
            ])
            ->all();
    }
}
