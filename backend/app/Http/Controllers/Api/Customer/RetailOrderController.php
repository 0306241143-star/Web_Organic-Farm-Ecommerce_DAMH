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
use App\Services\GoongGeocodingService;
use App\Services\RewardPointService;
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
                'street' => $address->Dia_chi_chi_tiet,
                'ward' => $address->Phuong_xa,
                'district' => $address->Quan_huyen,
                'province' => $address->Tinh_thanh,
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

    public function createAddress(Request $request, GoongGeocodingService $geocoder): JsonResponse
    {
        $validated = $request->validate($this->addressRules());
        $coordinates = $this->geocodeAddress($validated, $geocoder);
        $userId = (int) $request->user()->getAuthIdentifier();

        $address = DiaChiGiaoHang::query()->create([
            ...$this->addressAttributes($validated),
            'Ma_nguoi_dung' => $userId,
            'Vi_do' => $coordinates['latitude'],
            'Kinh_do' => $coordinates['longitude'],
            'La_mac_dinh' => ! DiaChiGiaoHang::query()->where('Ma_nguoi_dung', $userId)->exists(),
        ]);

        return $this->successResponse(
            message: 'Thêm địa chỉ giao hàng thành công.',
            data: $this->formatAddress($address),
            status: 201
        );
    }

    public function updateAddress(
        Request $request,
        int $addressId,
        GoongGeocodingService $geocoder
    ): JsonResponse {
        $address = $this->addressForCustomer($addressId, $request);
        $validated = $request->validate([
            'recipient_name' => ['sometimes', 'required', 'string', 'max:150'],
            'phone' => ['sometimes', 'required', 'string', 'regex:/^(?:\+84|0)\d{9,10}$/'],
            'street' => ['sometimes', 'required', 'string', 'max:255'],
            'ward' => ['sometimes', 'required', 'string', 'max:100'],
            'district' => ['sometimes', 'required', 'string', 'max:100'],
            'province' => ['sometimes', 'required', 'string', 'max:100'],
        ]);

        if ($validated === []) {
            throw ValidationException::withMessages([
                'address' => 'Cần cung cấp ít nhất một thông tin cần cập nhật.',
            ]);
        }

        $locationFields = ['street', 'ward', 'district', 'province'];
        $changesLocation = collect($locationFields)->contains(
            fn (string $field): bool => array_key_exists($field, $validated)
        );

        if ($changesLocation) {
            $validated = array_merge([
                'street' => $address->Dia_chi_chi_tiet,
                'ward' => $address->Phuong_xa,
                'district' => $address->Quan_huyen,
                'province' => $address->Tinh_thanh,
            ], $validated);
            $coordinates = $this->geocodeAddress($validated, $geocoder);
            $address->Vi_do = $coordinates['latitude'];
            $address->Kinh_do = $coordinates['longitude'];
        }

        $address->fill($this->addressAttributes($validated));
        $address->save();

        return $this->successResponse(
            message: 'Cập nhật địa chỉ giao hàng thành công.',
            data: $this->formatAddress($address->refresh())
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

    public function cancel(
        Request $request,
        int $orderId,
        RewardPointService $rewards
    ): JsonResponse {
        $userId = (int) $request->user()->getAuthIdentifier();

        $result = DB::transaction(function () use ($userId, $orderId, $rewards): array {
            $rewards->lockCustomer($userId);
            $payments = DB::table('thanh_toan')
                ->where('Ma_don_hang', $orderId)
                ->lockForUpdate()
                ->get(['Ma_thanh_toan', 'Trang_thai']);
            $order = DonHang::query()
                ->where('Ma_don_hang', $orderId)
                ->where('Ma_nguoi_dung', $userId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->Trang_thai === 'Da_huy') {
                return ['order' => $order, 'points_refunded' => 0];
            }

            $hasSuccessfulPayment = $payments->contains(
                fn (object $payment): bool => $payment->Trang_thai === 'Thanh_cong'
            );
            if (
                ! in_array($order->Trang_thai, ['Cho_thanh_toan', 'Cho_xac_nhan'], true)
                || $hasSuccessfulPayment
            ) {
                throw ValidationException::withMessages([
                    'order_id' => 'Đơn hàng đã được thanh toán hoặc đang xử lý nên không thể hủy tại đây.',
                ]);
            }

            $order->update(['Trang_thai' => 'Da_huy']);
            DB::table('thanh_toan')
                ->whereIn(
                    'Ma_thanh_toan',
                    $payments->where('Trang_thai', 'Khoi_tao')->pluck('Ma_thanh_toan')
                )
                ->update(['Trang_thai' => 'That_bai']);

            return [
                'order' => $order->refresh(),
                'points_refunded' => $rewards->refundOrderPoints($order),
            ];
        });

        return $this->successResponse(
            message: 'Hủy đơn hàng thành công.',
            data: [
                'order_id' => (int) $result['order']->Ma_don_hang,
                'status' => $result['order']->Trang_thai,
                'points_refunded' => $result['points_refunded'],
            ]
        );
    }

    public function quote(
        Request $request,
        CartPricingService $pricing,
        ShippingDistanceService $shipping,
        RewardPointService $rewards
    ): JsonResponse {
        $validated = $request->validate([
            'address_id' => ['required', 'integer', 'min:1'],
            'points_to_use' => ['sometimes', 'integer', 'min:0'],
        ]);
        $address = $this->addressForCustomer((int) $validated['address_id'], $request);
        $cart = $this->cartForCustomer($request);
        $items = $this->pricedItems($cart, $pricing);
        $delivery = $this->estimateShipping($address, $shipping);
        $subtotal = round((float) collect($items)->sum('line_total'), 2);
        $availablePoints = max(0, $rewards->balance((int) $request->user()->getAuthIdentifier()));
        $redemption = $rewards->calculateRedemption(
            (int) ($validated['points_to_use'] ?? 0),
            $availablePoints,
            $subtotal
        );

        return $this->successResponse(
            message: 'Tính báo giá đơn hàng thành công.',
            data: [
                ...$this->formatQuote($items, $subtotal, $delivery),
                ...$redemption,
                'points_available' => $availablePoints,
                'total' => (int) round($subtotal - $redemption['points_discount'] + $delivery['shipping_fee']),
            ]
        );
    }

    public function store(
        StoreOrderRequest $request,
        CartPricingService $pricing,
        ShippingDistanceService $shipping,
        RewardPointService $rewards
    ): JsonResponse {
        $address = $this->addressForCustomer((int) $request->validated('address_id'), $request);
        $cart = $this->cartForCustomer($request);
        $delivery = $this->estimateShipping($address, $shipping);
        $userId = (int) $request->user()->getAuthIdentifier();
        $paymentMethod = $request->validated('payment_method', 'ApiPay');
        $requestedPoints = (int) $request->validated('points_to_use', 0);

        $order = DB::transaction(function () use (
            $cart,
            $address,
            $delivery,
            $pricing,
            $request,
            $userId,
            $paymentMethod,
            $requestedPoints,
            $rewards
        ): DonHang {
            $rewards->lockCustomer($userId);
            $availablePoints = max(0, $rewards->balance($userId));
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
            $redemption = $rewards->calculateRedemption($requestedPoints, $availablePoints, $subtotal);
            $total = (int) round($subtotal - $redemption['points_discount'] + $delivery['shipping_fee']);

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
                'So_diem_su_dung' => $redemption['points_to_use'],
                'Tien_giam_tu_diem' => $redemption['points_discount'],
                'Tong_tien' => $total,
                'Trang_thai' => $paymentMethod === 'COD' ? 'Cho_xac_nhan' : 'Cho_thanh_toan',
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

            $rewards->recordRedemption($userId, $createdOrder, $redemption['points_to_use']);

            // Giỏ chỉ được dọn sau khi đơn và toàn bộ chi tiết đã lưu thành công.
            $lockedCart->chiTiets()->delete();

            return $createdOrder;
        });

        return $this->successResponse(
            message: $paymentMethod === 'COD'
                ? 'Đặt hàng COD thành công. Đơn hàng đang chờ nhân viên xác nhận.'
                : 'Tạo đơn hàng thành công. Vui lòng tiếp tục thanh toán.',
            data: [
                'order_id' => (int) $order->Ma_don_hang,
                'status' => $order->Trang_thai,
                'subtotal' => (float) $order->Tien_hang,
                'distance_km' => (float) $order->Khoang_cach_km,
                'shipping_fee' => (float) $order->Phi_giao_hang,
                'points_used' => (int) $order->So_diem_su_dung,
                'points_discount' => (float) $order->Tien_giam_tu_diem,
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

    private function addressRules(): array
    {
        return [
            'recipient_name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'regex:/^(?:\+84|0)\d{9,10}$/'],
            'street' => ['required', 'string', 'max:255'],
            'ward' => ['required', 'string', 'max:100'],
            'district' => ['required', 'string', 'max:100'],
            'province' => ['required', 'string', 'max:100'],
        ];
    }

    private function addressAttributes(array $validated): array
    {
        $attributes = [];
        foreach ([
            'recipient_name' => 'Ten_nguoi_nhan',
            'phone' => 'So_dien_thoai_nguoi_nhan',
            'street' => 'Dia_chi_chi_tiet',
            'ward' => 'Phuong_xa',
            'district' => 'Quan_huyen',
            'province' => 'Tinh_thanh',
        ] as $input => $column) {
            if (array_key_exists($input, $validated)) {
                $attributes[$column] = $validated[$input];
            }
        }

        return $attributes;
    }

    private function geocodeAddress(array $address, GoongGeocodingService $geocoder): array
    {
        try {
            return $geocoder->geocode(implode(', ', [
                $address['street'],
                $address['ward'],
                $address['district'],
                $address['province'],
            ]));
        } catch (ConnectionException|RuntimeException $exception) {
            Log::warning('Goong could not geocode a customer delivery address.', [
                'exception' => $exception::class,
            ]);

            throw ValidationException::withMessages([
                'address' => 'Không thể xác định tọa độ địa chỉ. Vui lòng kiểm tra địa chỉ hoặc thử lại.',
            ]);
        }
    }

    private function formatAddress(DiaChiGiaoHang $address): array
    {
        return [
            'id' => (int) $address->Ma_dia_chi,
            'recipient_name' => $address->Ten_nguoi_nhan,
            'phone' => $address->So_dien_thoai_nguoi_nhan,
            'street' => $address->Dia_chi_chi_tiet,
            'ward' => $address->Phuong_xa,
            'district' => $address->Quan_huyen,
            'province' => $address->Tinh_thanh,
            'address' => implode(', ', array_filter([
                $address->Dia_chi_chi_tiet,
                $address->Phuong_xa,
                $address->Quan_huyen,
                $address->Tinh_thanh,
            ])),
            'is_default' => (bool) $address->La_mac_dinh,
        ];
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
