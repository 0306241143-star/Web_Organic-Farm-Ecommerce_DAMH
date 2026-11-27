<?php

/*
 * Phê duyệt đơn hàng và ghi nhận thu tiền mặt COD cho nhân viên bán hàng.
 */

namespace App\Services\Order;

use App\Models\ChiTietDonHang;
use App\Models\DonHang;
use App\Models\PhanBoLoHang;
use App\Models\ThanhToan;
use App\Services\FefoStockService;
use App\Services\RecurringOrderStockService;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesOrderProcessingService
{
    public function __construct(
        private FefoStockService $stock,
        private RecurringOrderStockService $recurringStock
    ) {}

    public function confirmOrder(int $orderId, int $staffId): DonHang
    {
        // Khóa đơn trong transaction để phê duyệt và xuất kho không bị chạy trùng.
        return DB::transaction(function () use ($orderId, $staffId): DonHang {
            $order = DonHang::query()
                ->whereKey($orderId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($order->Trang_thai === 'Da_xac_nhan') {
                return $order;
            }

            if ($order->Trang_thai !== 'Cho_xac_nhan') {
                throw ValidationException::withMessages([
                    'order_id' => 'Chỉ có thể phê duyệt đơn hàng đang chờ xác nhận.',
                ]);
            }

            $scheduledDelivery = $this->recurringStock->availableDeliveryDate($order);
            if ($scheduledDelivery !== null && $scheduledDelivery->isAfter(CarbonImmutable::today())) {
                throw ValidationException::withMessages([
                    'order_id' => 'Đơn định kỳ đã được hoãn đến '.$scheduledDelivery->format('d/m/Y').'.',
                ]);
            }

            $payments = ThanhToan::query()
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->lockForUpdate()
                ->get();
            $codPayment = $payments->first(fn (ThanhToan $payment) => $payment->Phuong_thuc === 'COD');
            $isCodOrder = $codPayment !== null;
            $isPaidOrder = $payments->contains(
                fn (ThanhToan $payment) => $payment->Trang_thai === 'Thanh_cong'
            );
            if (
                ($isCodOrder && ! in_array($codPayment->Trang_thai, ['Khoi_tao', 'Thanh_cong'], true))
                || (! $isCodOrder && $order->Loai_don !== 'Giao_bu' && ! $isPaidOrder)
            ) {
                throw ValidationException::withMessages([
                    'order_id' => 'Đơn hàng chưa thanh toán thành công.',
                ]);
            }

            $details = ChiTietDonHang::query()
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->lockForUpdate()
                ->get();

            if ($details->isEmpty()) {
                throw ValidationException::withMessages([
                    'order_id' => 'Đơn hàng không có sản phẩm để xuất kho.',
                ]);
            }

            foreach ($details as $detail) {
                // Chỉ phân bổ phần còn thiếu nếu dòng đã có allocation trước đó.
                $allocatedQuantity = (float) PhanBoLoHang::query()
                    ->where('Ma_ct_don_hang', $detail->Ma_ct_don_hang)
                    ->sum('So_luong_xuat');
                $remainingQuantity = round((float) $detail->So_luong - $allocatedQuantity, 2);

                if ($remainingQuantity < 0) {
                    throw ValidationException::withMessages([
                        'order_id' => 'Phân bổ kho của đơn hàng vượt quá số lượng sản phẩm.',
                    ]);
                }

                if ($remainingQuantity === 0.0) {
                    continue;
                }

                foreach ($this->stock->allocateBatches((int) $detail->Ma_san_pham, $remainingQuantity) as $allocation) {
                    PhanBoLoHang::query()->create([
                        'Ma_ct_don_hang' => $detail->Ma_ct_don_hang,
                        'Ma_lo_hang' => $allocation['batch_id'],
                        'So_luong_xuat' => $allocation['quantity'],
                    ]);
                }
            }

            $order->update([
                'Trang_thai' => 'Da_xac_nhan',
                'Ma_nhan_vien_xac_nhan' => $staffId,
            ]);

            return $order->refresh();
        });
    }

    public function confirmCodCollection(int $orderId): DonHang
    {
        // Xác nhận thu tiền COD theo đúng thời điểm nhân viên ghi nhận.
        return DB::transaction(function () use ($orderId): DonHang {
            $order = DonHang::query()
                ->whereKey($orderId)
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($order->Trang_thai, ['Da_xac_nhan', 'Dang_giao', 'Hoan_thanh'], true)) {
                throw ValidationException::withMessages([
                    'order_id' => 'Chỉ xác nhận thu COD sau khi đơn hàng được phê duyệt.',
                ]);
            }

            $payment = ThanhToan::query()
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->where('Phuong_thuc', 'COD')
                ->lockForUpdate()
                ->first();

            if (! $payment) {
                throw ValidationException::withMessages([
                    'order_id' => 'Đơn hàng này không sử dụng phương thức COD.',
                ]);
            }

            if ($payment->Trang_thai === 'Thanh_cong') {
                return $order;
            }

            if ($payment->Trang_thai !== 'Khoi_tao') {
                throw ValidationException::withMessages([
                    'order_id' => 'Khoản thu COD không ở trạng thái có thể xác nhận.',
                ]);
            }

            $payment->update([
                'Trang_thai' => 'Thanh_cong',
                'Thoi_gian_thanh_toan' => now(),
            ]);

            return $order;
        });
    }
}
