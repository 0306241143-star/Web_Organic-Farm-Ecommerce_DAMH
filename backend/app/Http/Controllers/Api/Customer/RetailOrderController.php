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
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class RetailOrderController extends Controller
{
    use ApiResponse;

    /**
     * Lấy danh sách địa chỉ giao hàng của khách hàng hiện tại.
     */
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
                'detail_address' => $address->Dia_chi_chi_tiet,
                'ward' => $address->Phuong_xa,
                'district' => $address->Quan_huyen,
                'province' => $address->Tinh_thanh,
                'latitude' => (float) $address->Vi_do,
                'longitude' => (float) $address->Kinh_do,
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

    /**
     * Thêm địa chỉ nhận hàng mới cho khách hàng.
     */
    public function storeAddress(Request $request): JsonResponse
    {
        $userId = $request->user()->getAuthIdentifier();

        $validated = $request->validate([
            'recipient_name' => ['required', 'string', 'max:150'],
            'phone'          => ['required', 'string', 'max:15'],
            'detail_address' => ['required', 'string', 'max:255'],
            'ward'           => ['required', 'string', 'max:100'],
            'district'       => ['required', 'string', 'max:100'],
            'province'       => ['required', 'string', 'max:100'],
            'latitude'       => ['nullable', 'numeric'],
            'longitude'      => ['nullable', 'numeric'],
            'is_default'     => ['nullable', 'boolean'],
        ], [
            'recipient_name.required' => 'Vui lòng nhập tên người nhận.',
            'phone.required'          => 'Vui lòng nhập số điện thoại người nhận.',
            'detail_address.required' => 'Vui lòng nhập số nhà, tên đường chi tiết.',
            'ward.required'           => 'Vui lòng nhập phường/xã.',
            'district.required'       => 'Vui lòng nhập quận/huyện.',
            'province.required'       => 'Vui lòng nhập tỉnh/thành phố.',
        ]);

        $hasExisting = DiaChiGiaoHang::where('Ma_nguoi_dung', $userId)->exists();
        $isDefault = !empty($validated['is_default']) || !$hasExisting;

        if ($isDefault) {
            DiaChiGiaoHang::where('Ma_nguoi_dung', $userId)->update(['La_mac_dinh' => false]);
        }

        $address = DiaChiGiaoHang::create([
            'Ma_nguoi_dung'            => $userId,
            'Ten_nguoi_nhan'           => $validated['recipient_name'],
            'So_dien_thoai_nguoi_nhan' => $validated['phone'],
            'Dia_chi_chi_tiet'         => $validated['detail_address'],
            'Phuong_xa'                => $validated['ward'],
            'Quan_huyen'               => $validated['district'],
            'Tinh_thanh'               => $validated['province'],
            'Vi_do'                    => $validated['latitude'] ?? 10.7825400,
            'Kinh_do'                  => $validated['longitude'] ?? 106.6934200,
            'La_mac_dinh'              => $isDefault,
        ]);

        return $this->successResponse(
            message: 'Thêm địa chỉ giao hàng mới thành công.',
            data: [
                'id'             => (int) $address->Ma_dia_chi,
                'recipient_name' => $address->Ten_nguoi_nhan,
                'phone'          => $address->So_dien_thoai_nguoi_nhan,
                'detail_address' => $address->Dia_chi_chi_tiet,
                'ward'           => $address->Phuong_xa,
                'district'       => $address->Quan_huyen,
                'province'       => $address->Tinh_thanh,
                'latitude'       => (float) $address->Vi_do,
                'longitude'      => (float) $address->Kinh_do,
                'address'        => implode(', ', array_filter([
                    $address->Dia_chi_chi_tiet,
                    $address->Phuong_xa,
                    $address->Quan_huyen,
                    $address->Tinh_thanh,
                ])),
                'is_default'     => (bool) $address->La_mac_dinh,
            ]
        );
    }

    /**
     * Cập nhật thông tin địa chỉ giao hàng.
     */
    public function updateAddress(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->getAuthIdentifier();

        $address = DiaChiGiaoHang::where('Ma_nguoi_dung', $userId)
            ->where('Ma_dia_chi', $id)
            ->first();

        if (!$address) {
            return $this->errorResponse(
                message: 'Không tìm thấy địa chỉ giao hàng yêu cầu.',
                status: 404,
                errorCode: self::ERR_NOT_FOUND
            );
        }

        $validated = $request->validate([
            'recipient_name' => ['required', 'string', 'max:150'],
            'phone'          => ['required', 'string', 'max:15'],
            'detail_address' => ['required', 'string', 'max:255'],
            'ward'           => ['required', 'string', 'max:100'],
            'district'       => ['required', 'string', 'max:100'],
            'province'       => ['required', 'string', 'max:100'],
            'latitude'       => ['nullable', 'numeric'],
            'longitude'      => ['nullable', 'numeric'],
            'is_default'     => ['nullable', 'boolean'],
        ]);

        $isDefault = !empty($validated['is_default']);

        if ($isDefault) {
            DiaChiGiaoHang::where('Ma_nguoi_dung', $userId)
                ->where('Ma_dia_chi', '!=', $id)
                ->update(['La_mac_dinh' => false]);
        }

        $address->update([
            'Ten_nguoi_nhan'           => $validated['recipient_name'],
            'So_dien_thoai_nguoi_nhan' => $validated['phone'],
            'Dia_chi_chi_tiet'         => $validated['detail_address'],
            'Phuong_xa'                => $validated['ward'],
            'Quan_huyen'               => $validated['district'],
            'Tinh_thanh'               => $validated['province'],
            'Vi_do'                    => $validated['latitude'] ?? $address->Vi_do,
            'Kinh_do'                  => $validated['longitude'] ?? $address->Kinh_do,
            'La_mac_dinh'              => $isDefault ? true : $address->La_mac_dinh,
        ]);

        return $this->successResponse(
            message: 'Cập nhật địa chỉ giao hàng thành công.',
            data: [
                'id'             => (int) $address->Ma_dia_chi,
                'recipient_name' => $address->Ten_nguoi_nhan,
                'phone'          => $address->So_dien_thoai_nguoi_nhan,
                'detail_address' => $address->Dia_chi_chi_tiet,
                'ward'           => $address->Phuong_xa,
                'district'       => $address->Quan_huyen,
                'province'       => $address->Tinh_thanh,
                'latitude'       => (float) $address->Vi_do,
                'longitude'      => (float) $address->Kinh_do,
                'address'        => implode(', ', array_filter([
                    $address->Dia_chi_chi_tiet,
                    $address->Phuong_xa,
                    $address->Quan_huyen,
                    $address->Tinh_thanh,
                ])),
                'is_default'     => (bool) $address->La_mac_dinh,
            ]
        );
    }

    /**
     * Xóa một địa chỉ nhận hàng của khách.
     */
    public function destroyAddress(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->getAuthIdentifier();

        $address = DiaChiGiaoHang::where('Ma_nguoi_dung', $userId)
            ->where('Ma_dia_chi', $id)
            ->first();

        if (!$address) {
            return $this->errorResponse(
                message: 'Không tìm thấy địa chỉ để xóa.',
                status: 404,
                errorCode: self::ERR_NOT_FOUND
            );
        }

        $wasDefault = (bool) $address->La_mac_dinh;
        $address->delete();

        // Nếu vừa xóa địa chỉ mặc định, tự động gán địa chỉ còn lại gần nhất làm mặc định
        if ($wasDefault) {
            $nextAddress = DiaChiGiaoHang::where('Ma_nguoi_dung', $userId)
                ->orderByDesc('Ma_dia_chi')
                ->first();

            if ($nextAddress) {
                $nextAddress->update(['La_mac_dinh' => true]);
            }
        }

        return $this->successResponse(
            message: 'Xóa địa chỉ giao hàng thành công.',
            data: ['deleted_id' => $id]
        );
    }

    /**
     * Đặt một địa chỉ làm địa chỉ giao hàng mặc định.
     */
    public function setDefaultAddress(Request $request, int $id): JsonResponse
    {
        $userId = $request->user()->getAuthIdentifier();

        $address = DiaChiGiaoHang::where('Ma_nguoi_dung', $userId)
            ->where('Ma_dia_chi', $id)
            ->first();

        if (!$address) {
            return $this->errorResponse(
                message: 'Không tìm thấy địa chỉ để đặt mặc định.',
                status: 404,
                errorCode: self::ERR_NOT_FOUND
            );
        }

        DiaChiGiaoHang::where('Ma_nguoi_dung', $userId)->update(['La_mac_dinh' => false]);
        $address->update(['La_mac_dinh' => true]);

        return $this->successResponse(
            message: 'Thiết lập địa chỉ mặc định thành công.',
            data: ['id' => $id, 'is_default' => true]
        );
    }

    /**
     * Cập nhật thông tin hồ sơ cá nhân của khách hàng (Số điện thoại, Email).
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $userId = $user->getAuthIdentifier();

        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:15', 'unique:nguoi_dung,So_dien_thoai,' . $userId . ',Ma_nguoi_dung'],
            'email' => ['nullable', 'email', 'max:150', 'unique:nguoi_dung,Email,' . $userId . ',Ma_nguoi_dung'],
            'name'  => ['nullable', 'string', 'max:150'],
        ], [
            'phone.required' => 'Vui lòng nhập số điện thoại.',
            'phone.unique'   => 'Số điện thoại này đã được sử dụng bởi tài khoản khác.',
            'email.email'    => 'Địa chỉ email không đúng định dạng.',
            'email.unique'   => 'Địa chỉ email này đã được sử dụng bởi tài khoản khác.',
        ]);

        if (!empty($validated['name'])) {
            $user->Ho_ten = $validated['name'];
        }
        if (!empty($validated['email'])) {
            $user->Email = $validated['email'];
        }
        $user->So_dien_thoai = $validated['phone'];
        $user->save();

        $roleSlug = $user->getRoleSlug();

        return $this->successResponse(
            message: 'Cập nhật thông tin hồ sơ thành công.',
            data: [
                'user' => [
                    'id'     => $user->Ma_nguoi_dung,
                    'name'   => $user->Ho_ten,
                    'email'  => $user->Email,
                    'phone'  => $user->So_dien_thoai,
                    'role'   => $roleSlug,
                    'roles'  => [$roleSlug],
                    'status' => $user->Trang_thai,
                ],
            ]
        );
    }

    /**
     * Khách hàng đổi mật khẩu tài khoản (xác thực mật khẩu cũ và mã hóa mật khẩu mới).
     */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password'     => ['required', 'string', 'min:8', 'confirmed'],
        ], [
            'current_password.required' => 'Vui lòng nhập mật khẩu hiện tại.',
            'new_password.required'     => 'Vui lòng nhập mật khẩu mới.',
            'new_password.min'          => 'Mật khẩu mới phải có tối thiểu 8 ký tự.',
            'new_password.confirmed'    => 'Xác nhận mật khẩu mới không trùng khớp.',
        ]);

        // Kiểm tra tính chính xác của mật khẩu hiện tại
        if (!Hash::check($validated['current_password'], $user->Mat_khau_ma_hoa)) {
            return $this->errorResponse(
                message: 'Mật khẩu hiện tại không chính xác.',
                status: 422,
                errorCode: self::ERR_VALIDATION,
                errors: ['current_password' => ['Mật khẩu hiện tại không chính xác.']]
            );
        }

        // Cập nhật mật khẩu mã hóa mới
        $user->Mat_khau_ma_hoa = Hash::make($validated['new_password']);
        $user->save();

        return $this->successResponse(
            message: 'Đổi mật khẩu tài khoản thành công.',
            data: null
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

            $stockRestored = $this->restoreAllocatedStock($order);
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
                'stock_restored' => $stockRestored,
            ];
        });

        return $this->successResponse(
            message: 'Hủy đơn hàng thành công.',
            data: [
                'order_id' => (int) $result['order']->Ma_don_hang,
                'status' => $result['order']->Trang_thai,
                'points_refunded' => $result['points_refunded'],
                'stock_restored' => $result['stock_restored'] ?? 0,
            ]
        );
    }

    private function restoreAllocatedStock(DonHang $order): float
    {
        $allocations = DB::table('phan_bo_lo_hang as allocation')
            ->join('chi_tiet_don_hang as detail', 'detail.Ma_ct_don_hang', '=', 'allocation.Ma_ct_don_hang')
            ->where('detail.Ma_don_hang', $order->Ma_don_hang)
            ->lockForUpdate()
            ->get(['allocation.Ma_lo_hang', 'allocation.So_luong_xuat'])
            ->groupBy('Ma_lo_hang');
        $restored = 0.0;

        foreach ($allocations as $batchId => $items) {
            $batch = DB::table('lo_hang')
                ->where('Ma_lo_hang', $batchId)
                ->lockForUpdate()
                ->first();

            if (! $batch || $batch->Trang_thai === 'Da_huy') {
                continue;
            }

            $quantity = (float) $items->sum('So_luong_xuat');
            DB::table('lo_hang')
                ->where('Ma_lo_hang', $batchId)
                ->increment('So_luong_con_lai', $quantity);

            if (
                $batch->Trang_thai === 'Het_hang'
                && $batch->Han_su_dung >= now()->toDateString()
            ) {
                DB::table('lo_hang')
                    ->where('Ma_lo_hang', $batchId)
                    ->update(['Trang_thai' => 'Con_hang']);
            }

            $restored += $quantity;
        }

        return $restored;
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
