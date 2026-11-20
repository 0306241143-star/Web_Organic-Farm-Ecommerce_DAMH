<?php

/*
 * Luồng khách hàng: lịch sử đơn hàng và theo dõi tiến trình giao nhận.
 */

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\DonHang;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'in:Cho_thanh_toan,Cho_xac_nhan,Da_xac_nhan,Dang_giao,Hoan_thanh,Da_huy'],
            'order_type' => ['nullable', 'in:Mua_le,Dinh_ky,Giao_bu'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $orders = DonHang::query()
            ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
            ->when(
                $validated['status'] ?? null,
                fn ($query, string $status) => $query->where('Trang_thai', $status)
            )
            ->when(
                $validated['order_type'] ?? null,
                fn ($query, string $type) => $query->where('Loai_don', $type)
            )
            ->with(['chiTiets.sanPham', 'diaChi', 'thanhToans', 'giaoHang', 'dangKyGoi.goi'])
            ->orderByDesc('Ngay_dat')
            ->orderByDesc('Ma_don_hang')
            ->paginate((int) ($validated['per_page'] ?? 10));

        return $this->paginatedResponse(
            $orders,
            'Lấy lịch sử đơn hàng thành công.',
            $orders->getCollection()->map(fn (DonHang $order) => $this->formatOrder($order))->all()
        );
    }

    public function show(Request $request, int $orderId): JsonResponse
    {
        $order = DonHang::query()
            ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
            ->where('Ma_don_hang', $orderId)
            ->with(['chiTiets.sanPham', 'diaChi', 'thanhToans', 'giaoHang', 'dangKyGoi.goi'])
            ->firstOrFail();

        return $this->successResponse(
            'Lấy chi tiết đơn hàng thành công.',
            $this->formatOrder($order)
        );
    }

    private function formatOrder(DonHang $order): array
    {
        $address = $order->diaChi;
        $delivery = $order->giaoHang;
        $registration = $order->dangKyGoi;

        return [
            'order_id' => (int) $order->Ma_don_hang,
            'order_type' => $order->Loai_don,
            'status' => $order->Trang_thai,
            'ordered_at' => $order->Ngay_dat,
            'subtotal' => (float) $order->Tien_hang,
            'distance_km' => (float) $order->Khoang_cach_km,
            'shipping_fee' => (float) $order->Phi_giao_hang,
            'points_used' => (int) $order->So_diem_su_dung,
            'points_discount' => (float) $order->Tien_giam_tu_diem,
            'total' => (float) $order->Tong_tien,
            'note' => $order->Ghi_chu,
            'address' => $address ? [
                'recipient_name' => $address->Ten_nguoi_nhan,
                'phone' => $address->So_dien_thoai_nguoi_nhan,
                'detail' => implode(', ', array_filter([
                    $address->Dia_chi_chi_tiet,
                    $address->Phuong_xa,
                    $address->Quan_huyen,
                    $address->Tinh_thanh,
                ])),
            ] : null,
            'items' => $order->chiTiets->map(fn ($item) => [
                'product_id' => (int) $item->Ma_san_pham,
                'name' => $item->sanPham?->Ten_san_pham ?? 'Sản phẩm đã ngừng kinh doanh',
                'image' => $item->sanPham?->Hinh_anh_dai_dien,
                'unit' => $item->sanPham?->Don_vi_tinh,
                'quantity' => (float) $item->So_luong,
                'unit_price' => (float) $item->Don_gia,
                'line_total' => (float) $item->Thanh_tien,
            ])->all(),
            'payments' => $order->thanhToans->map(fn ($payment) => [
                'method' => $payment->Phuong_thuc,
                'status' => $payment->Trang_thai,
                'amount' => (float) $payment->So_tien,
                'paid_at' => $payment->Thoi_gian_thanh_toan,
            ])->all(),
            'delivery' => $delivery ? [
                'carrier' => $delivery->Don_vi_van_chuyen,
                'tracking_number' => $delivery->Ma_van_don,
                'status' => $delivery->Trang_thai,
                'shipped_at' => $delivery->Ngay_xuat_giao,
                'delivered_at' => $delivery->Ngay_giao_thanh_cong,
            ] : null,
            'subscription' => $registration ? [
                'subscription_id' => (int) $registration->Ma_dang_ky,
                'package_name' => $registration->goi?->Ten_goi,
            ] : null,
            'can_cancel' => in_array($order->Trang_thai, ['Cho_thanh_toan', 'Cho_xac_nhan'], true)
                && ! $order->thanhToans->contains(fn ($payment) => $payment->Trang_thai === 'Thanh_cong'),
        ];
    }
}
