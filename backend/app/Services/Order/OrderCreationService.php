<?php

/*
 * Tạo đơn mua lẻ, chi tiết đơn và phân bổ tồn kho trong một giao dịch.
 */

namespace App\Services\Order;

use App\Models\ChiTietDonHang;
use App\Models\ChiTietFlashSale;
use App\Models\DiaChiGiaoHang;
use App\Models\DonHang;
use App\Models\GioHang;
use App\Models\PhanBoLoHang;
use App\Models\ThanhToan;
use App\Services\CartPricingService;
use App\Services\FefoStockService;
use App\Services\GoongGeocodingService;
use App\Services\RewardPointService;
use App\Services\ShippingDistanceService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class OrderCreationService
{
    private const LEGACY_DEFAULT_LATITUDE = 10.7825400;

    private const LEGACY_DEFAULT_LONGITUDE = 106.6934200;

    public function __construct(
        private FefoStockService $stock,
        private CartPricingService $pricing,
        private ShippingDistanceService $shipping,
        private RewardPointService $rewards,
        private GoongGeocodingService $geocoder
    ) {
    }

    /**
     * @return array{order: DonHang}
     */
    public function createRetailOrder(int $userId, array $validated): array
    {
        // Bắt buộc địa chỉ thuộc người đặt để tránh tham chiếu địa chỉ người khác.
        $address = DiaChiGiaoHang::query()
            ->where('Ma_dia_chi', (int) $validated['address_id'])
            ->where('Ma_nguoi_dung', $userId)
            ->firstOrFail();
        $this->refreshLegacyDefaultCoordinates($address);

        $cart = GioHang::query()
            ->where('Ma_nguoi_dung', $userId)
            ->with('chiTiets.sanPham')
            ->first();

        if (! $cart || $cart->chiTiets->isEmpty()) {
            throw ValidationException::withMessages([
                'cart' => 'Giỏ hàng đang trống. Vui lòng thêm sản phẩm trước khi đặt hàng.',
            ]);
        }

        try {
            // Ước tính khoảng cách và phí trước khi mở transaction ghi đơn.
            $delivery = $this->shipping->estimate($address);
        } catch (ConnectionException|RuntimeException $exception) {
            throw new ShippingEstimationException(
                'Retail checkout could not estimate shipping.',
                0,
                $exception
            );
        }
        $paymentMethod = $validated['payment_method'] ?? 'ApiPay';
        $requestedPoints = (int) ($validated['points_to_use'] ?? 0);

        $order = DB::transaction(function () use (
            $cart,
            $address,
            $delivery,
            $userId,
            $paymentMethod,
            $requestedPoints,
            $validated
        ): DonHang {
            // Khóa tài khoản, giỏ và tồn để áp dụng điểm và FEFO an toàn.
            $this->rewards->lockCustomer($userId);
            $availablePoints = max(0, $this->rewards->balance($userId));
            $lockedCart = GioHang::query()
                ->whereKey($cart->Ma_gio_hang)
                ->where('Ma_nguoi_dung', $userId)
                ->lockForUpdate()
                ->firstOrFail();
            $lockedCart->setRelation(
                'chiTiets',
                $lockedCart->chiTiets()->lockForUpdate()->get()->load('sanPham')
            );
            $items = $this->pricedItems($lockedCart, lockForUpdate: true);

            $subtotal = round((float) collect($items)->sum('line_total'), 2);
            $redemption = $this->rewards->calculateRedemption($requestedPoints, $availablePoints, $subtotal);
            // Tổng tiền phải nằm trong giới hạn thanh toán trực tuyến.
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
                'Ghi_chu' => $validated['note'] ?? null,
            ]);

            foreach ($items as $item) {
                // Lưu chi tiết và giữ liên kết với Flash Sale nếu dòng được áp giá khuyến mãi.
                $detail = ChiTietDonHang::query()->create([
                    'Ma_don_hang' => $createdOrder->Ma_don_hang,
                    'Ma_san_pham' => $item['id'],
                    'Ma_ct_flash_sale' => $item['flash_sale_detail_id'],
                    'So_luong' => $item['quantity'],
                    'Don_gia' => $item['price'],
                    'Thanh_tien' => $item['line_total'],
                ]);

                $flashSaleItem = null;
                if ($item['flash_sale_detail_id'] !== null) {
                    $flashSaleItem = ChiTietFlashSale::query()
                        ->whereKey($item['flash_sale_detail_id'])
                        ->lockForUpdate()
                        ->first();

                    if (
                        ! $flashSaleItem
                        || (float) $flashSaleItem->So_luong_gioi_han
                            - (float) $flashSaleItem->So_luong_da_ban
                            < (float) $item['quantity']
                    ) {
                        throw ValidationException::withMessages([
                            'cart' => 'Số lượng Flash Sale vừa thay đổi. Vui lòng tải lại giỏ hàng.',
                        ]);
                    }
                }

                foreach ($this->stock->allocateBatches(
                    (int) $item['id'],
                    (float) $item['quantity'],
                    $flashSaleItem ? (int) $flashSaleItem->Ma_lo_hang : null
                ) as $allocation) {
                    PhanBoLoHang::query()->create([
                        'Ma_ct_don_hang' => $detail->Ma_ct_don_hang,
                        'Ma_lo_hang' => $allocation['batch_id'],
                        'So_luong_xuat' => $allocation['quantity'],
                    ]);
                }

                if ($flashSaleItem) {
                    $flashSaleItem->increment('So_luong_da_ban', (float) $item['quantity']);
                }
            }

            if ($paymentMethod === 'COD') {
                ThanhToan::query()->create([
                    'Ma_don_hang' => $createdOrder->Ma_don_hang,
                    'Phuong_thuc' => 'COD',
                    'So_tien' => $createdOrder->Tong_tien,
                    'Trang_thai' => 'Khoi_tao',
                ]);
            }

            $this->rewards->recordRedemption($userId, $createdOrder, $redemption['points_to_use']);

            // Giỏ chỉ được dọn sau khi đơn và toàn bộ chi tiết đã lưu thành công.
            $lockedCart->chiTiets()->delete();

            return $createdOrder;
        });

        return ['order' => $order];
    }

    private function pricedItems(GioHang $cart, bool $lockForUpdate = false): array
    {
        $items = $this->pricing->priceCart($cart, $lockForUpdate);

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

    private function refreshLegacyDefaultCoordinates(DiaChiGiaoHang $address): void
    {
        if (
            abs((float) $address->Vi_do - self::LEGACY_DEFAULT_LATITUDE) > 0.0000001
            || abs((float) $address->Kinh_do - self::LEGACY_DEFAULT_LONGITUDE) > 0.0000001
        ) {
            return;
        }

        try {
            $coordinates = $this->geocoder->geocode(implode(', ', [
                $address->Dia_chi_chi_tiet,
                $address->Phuong_xa,
                $address->Tinh_thanh,
            ]));
        } catch (ConnectionException|RuntimeException $exception) {
            Log::warning('Goong could not geocode a customer delivery address.', [
                'exception' => $exception::class,
            ]);

            throw ValidationException::withMessages([
                'address' => 'Không thể xác định tọa độ địa chỉ. Vui lòng kiểm tra địa chỉ hoặc thử lại.',
            ]);
        }

        $address->update([
            'Vi_do' => $coordinates['latitude'],
            'Kinh_do' => $coordinates['longitude'],
        ]);
    }
}