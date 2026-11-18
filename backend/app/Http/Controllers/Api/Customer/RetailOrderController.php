<?php

/*
 * Tạo báo giá và đơn mua lẻ từ giỏ hàng của khách đang đăng nhập.
 */

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreOrderRequest;
use App\Models\ChiTietDonHang;
use App\Models\DiaChiGiaoHang;
use App\Models\DonHang;
use App\Models\GioHang;
use App\Services\CartPricingService;
use App\Services\ShippingDistanceService;
use App\Traits\ApiResponse;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class RetailOrderController extends Controller
{
    use ApiResponse;

    public function addresses(Request $request): JsonResponse
    {
        $addresses = DiaChiGiaoHang::query()
            ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
            ->orderByDesc('La_mac_dinh')
            ->orderBy('Ma_dia_chi')
            ->get([
                'Ma_dia_chi',
                'Ten_nguoi_nhan',
                'So_dien_thoai_nguoi_nhan',
                'Dia_chi_chi_tiet',
                'Phuong_xa',
                'Quan_huyen',
                'Tinh_thanh',
                'Vi_do',
                'Kinh_do',
                'La_mac_dinh',
            ])
            ->map(fn (DiaChiGiaoHang $address) => [
                'id' => (int) $address->Ma_dia_chi,
                'recipient_name' => $address->Ten_nguoi_nhan,
                'phone' => $address->So_dien_thoai_nguoi_nhan,
                'address' => implode(', ', array_filter([
                    $address->Dia_chi_chi_tiet,
                    $address->Phuong_xa,
                    $address->Quan_huyen,
                    $address->Tinh_thanh,
                ])),
                'is_default' => (bool) $address->La_mac_dinh,
            ]);

        return $this->successResponse(
            message: 'Lấy danh sách địa chỉ giao hàng thành công.',
            data: $addresses
        );
    }

    public function status(Request $request, int $orderId): JsonResponse
    {
        $order = DonHang::query()
            ->where('Ma_don_hang', $orderId)
            ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
            ->firstOrFail();

        $payment = DB::table('thanh_toan')
            ->where('Ma_don_hang', $order->Ma_don_hang)
            ->where('Phuong_thuc', 'ApiPay')
            ->latest('Ma_thanh_toan')
            ->first();

        return $this->successResponse(
            message: 'Lấy trạng thái đơn hàng thành công.',
            data: [
                'order_id' => (int) $order->Ma_don_hang,
                'status' => $order->Trang_thai,
                'payment_status' => $payment?->Trang_thai,
            ]
        );
    }

    public function quote(
        Request $request,
        CartPricingService $pricing,
        ShippingDistanceService $shipping
    ): JsonResponse {
        $validated = $request->validate([
            'address_id' => ['required', 'integer', 'min:1'],
        ]);
        $address = $this->addressForCustomer((int) $validated['address_id'], $request);
        $cart = $this->cartForCustomer($request);
        $items = $this->pricedItems($cart, $pricing);
        $delivery = $this->estimateShipping($address, $shipping);
        $subtotal = round((float) collect($items)->sum('line_total'), 2);

        return $this->successResponse(
            message: 'Tính báo giá đơn hàng thành công.',
            data: $this->formatQuote($items, $subtotal, $delivery)
        );
    }

    public function store(
        StoreOrderRequest $request,
        CartPricingService $pricing,
        ShippingDistanceService $shipping
    ): JsonResponse {
        $address = $this->addressForCustomer((int) $request->validated('address_id'), $request);
        $cart = $this->cartForCustomer($request);
        $delivery = $this->estimateShipping($address, $shipping);
        $userId = (int) $request->user()->getAuthIdentifier();

        $order = DB::transaction(function () use ($cart, $address, $delivery, $pricing, $request, $userId): DonHang {
            $lockedCart = GioHang::query()
                ->whereKey($cart->Ma_gio_hang)
                ->where('Ma_nguoi_dung', $userId)
                ->lockForUpdate()
                ->firstOrFail();
            $lockedCart->setRelation(
                'chiTiets',
                $lockedCart->chiTiets()->lockForUpdate()->get()->load('sanPham')
            );
            $items = $this->pricedItems($lockedCart, $pricing, lockForUpdate: true);

            $subtotal = round((float) collect($items)->sum('line_total'), 2);
            $total = (int) round($subtotal + $delivery['shipping_fee']);

            if ($total < 1 || $total > 300_000_000) {
                throw ValidationException::withMessages([
                    'cart' => 'Tổng tiền đơn hàng không hợp lệ để thanh toán trực tuyến.',
                ]);
            }

            $createdOrder = DonHang::query()->create([
                'Ma_nguoi_dung' => $userId,
                'Ma_dia_chi' => $address->Ma_dia_chi,
                'Loai_don' => 'Mua_le',
                'Tien_hang' => $subtotal,
                'Khoang_cach_km' => $delivery['distance_km'],
                'Phi_giao_hang' => $delivery['shipping_fee'],
                'Tong_tien' => $total,
                'Trang_thai' => 'Cho_thanh_toan',
                'Ghi_chu' => $request->validated('note'),
            ]);

            foreach ($items as $item) {
                ChiTietDonHang::query()->create([
                    'Ma_don_hang' => $createdOrder->Ma_don_hang,
                    'Ma_san_pham' => $item['id'],
                    'Ma_ct_flash_sale' => $item['flash_sale_detail_id'],
                    'So_luong' => $item['quantity'],
                    'Don_gia' => $item['price'],
                    'Thanh_tien' => $item['line_total'],
                ]);
            }

            // Giỏ chỉ được dọn sau khi đơn và toàn bộ chi tiết đã lưu thành công.
            $lockedCart->chiTiets()->delete();

            return $createdOrder;
        });

        return $this->successResponse(
            message: 'Tạo đơn hàng thành công. Vui lòng tiếp tục thanh toán.',
            data: [
                'order_id' => (int) $order->Ma_don_hang,
                'status' => $order->Trang_thai,
                'subtotal' => (float) $order->Tien_hang,
                'distance_km' => (float) $order->Khoang_cach_km,
                'shipping_fee' => (float) $order->Phi_giao_hang,
                'total' => (float) $order->Tong_tien,
            ],
            status: 201
        );
    }

    private function addressForCustomer(int $addressId, Request $request): DiaChiGiaoHang
    {
        return DiaChiGiaoHang::query()
            ->where('Ma_dia_chi', $addressId)
            ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
            ->firstOrFail();
    }

    private function cartForCustomer(Request $request): GioHang
    {
        $cart = GioHang::query()
            ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
            ->with('chiTiets.sanPham')
            ->first();

        if (! $cart || $cart->chiTiets->isEmpty()) {
            throw ValidationException::withMessages([
                'cart' => 'Giỏ hàng đang trống. Vui lòng thêm sản phẩm trước khi đặt hàng.',
            ]);
        }

        return $cart;
    }

    private function pricedItems(
        GioHang $cart,
        CartPricingService $pricing,
        bool $lockForUpdate = false
    ): array {
        $items = $pricing->priceCart($cart, $lockForUpdate);

        if ($items === []) {
            throw ValidationException::withMessages([
                'cart' => 'Giỏ hàng đang trống hoặc không còn sản phẩm hợp lệ.',
            ]);
        }

        $unavailable = collect($items)->first(fn (array $item) => ! $item['is_available']);
        if ($unavailable) {
            throw ValidationException::withMessages([
                'cart' => "Sản phẩm {$unavailable['product']->Ten_san_pham} đã hết hàng hoặc không đủ số lượng trong kho. Hãy cập nhật giỏ hàng.",
            ]);
        }

        return $items;
    }

    private function estimateShipping(
        DiaChiGiaoHang $address,
        ShippingDistanceService $shipping
    ): array {
        try {
            return $shipping->estimate($address);
        } catch (ConnectionException|RuntimeException $exception) {
            Log::warning('Retail checkout could not estimate shipping.', [
                'address_id' => $address->Ma_dia_chi,
                'exception' => $exception::class,
            ]);

            throw new HttpResponseException($this->errorResponse(
                message: 'Chưa thể tính khoảng cách giao hàng. Vui lòng thử lại sau.',
                status: 503,
                errorCode: self::ERR_SERVER
            ));
        }
    }

    private function formatQuote(array $items, float $subtotal, array $delivery): array
    {
        return [
            'items' => array_map(fn (array $item) => [
                'id' => $item['id'],
                'name' => $item['product']->Ten_san_pham,
                'unit' => $item['product']->Don_vi_tinh,
                'quantity' => $item['quantity'],
                'unit_price' => $item['price'],
                'line_total' => $item['line_total'],
            ], $items),
            'subtotal' => $subtotal,
            'distance_km' => $delivery['distance_km'],
            'shipping_fee' => $delivery['shipping_fee'],
            'price_per_km' => $delivery['price_per_km'],
            'origin_name' => $delivery['origin_name'],
            'total' => (int) round($subtotal + $delivery['shipping_fee']),
        ];
    }
}
