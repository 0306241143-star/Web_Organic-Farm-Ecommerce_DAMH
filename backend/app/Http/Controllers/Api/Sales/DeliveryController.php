<?php

/*
 * Luồng bán hàng: điều phối giao hàng và cập nhật trạng thái vận chuyển.
 */

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\DonHang;
use App\Models\GiaoHang;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DeliveryController extends Controller
{
    use ApiResponse;

    public function dispatch(int $orderId, Request $request): JsonResponse
    {
        // Xác thực đơn vị vận chuyển, mã vận đơn và trạng thái giao hàng.
        $validated = $request->validate([
            'carrier' => ['required', 'string', 'max:100'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'status' => ['required', 'in:Chuan_bi,Dang_giao,Giao_thanh_cong,Giao_that_bai'],
        ], [
            'carrier.required' => 'Vui lòng chọn hoặc nhập đơn vị vận chuyển.',
            'carrier.max' => 'Tên đơn vị vận chuyển không được vượt quá 100 ký tự.',
            'tracking_number.max' => 'Mã vận đơn không được vượt quá 100 ký tự.',
            'status.required' => 'Vui lòng chọn trạng thái giao hàng.',
            'status.in' => 'Trạng thái giao hàng không hợp lệ.',
        ]);

        $staffId = (int) $request->user()->getAuthIdentifier();

        // Cập nhật bản ghi giao hàng và trạng thái đơn trong cùng một transaction.
        $delivery = DB::transaction(function () use ($orderId, $validated, $staffId): GiaoHang {
            $order = DonHang::query()
                ->whereKey($orderId)
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($order->Trang_thai, ['Da_xac_nhan', 'Dang_giao'], true)) {
                throw ValidationException::withMessages([
                    'order_id' => 'Chỉ có thể điều phối giao hàng cho đơn đã xác nhận hoặc đang giao.',
                ]);
            }

            $delivery = GiaoHang::query()
                ->where('Ma_don_hang', $order->Ma_don_hang)
                ->lockForUpdate()
                ->first();

            $newStatus = $validated['status'];
            $trackingNumber = trim((string) ($validated['tracking_number'] ?? ''));

            $shippedAt = $delivery?->Ngay_xuat_giao;
            if (in_array($newStatus, ['Dang_giao', 'Giao_thanh_cong'], true) && $shippedAt === null) {
                $shippedAt = now();
            }

            $deliveredAt = $delivery?->Ngay_giao_thanh_cong;
            if ($newStatus === 'Giao_thanh_cong' && $deliveredAt === null) {
                $deliveredAt = now();
            } elseif ($newStatus !== 'Giao_thanh_cong') {
                $deliveredAt = null;
            }

            $payload = [
                'Ma_nhan_vien_dieu_phoi' => $staffId,
                'Don_vi_van_chuyen' => trim($validated['carrier']),
                'Ma_van_don' => $trackingNumber !== '' ? $trackingNumber : null,
                'Trang_thai' => $newStatus,
                'Ngay_xuat_giao' => $shippedAt,
                'Ngay_giao_thanh_cong' => $deliveredAt,
            ];

            if ($delivery) {
                $delivery->update($payload);
                $delivery = $delivery->refresh();
            } else {
                $delivery = GiaoHang::query()->create(array_merge($payload, [
                    'Ma_don_hang' => $order->Ma_don_hang,
                ]));
            }

            // Đồng bộ trạng thái đơn hàng tương ứng với tiến độ giao nhận
            if ($newStatus === 'Dang_giao' && $order->Trang_thai === 'Da_xac_nhan') {
                $order->update(['Trang_thai' => 'Dang_giao']);
            } elseif ($newStatus === 'Giao_thanh_cong') {
                $order->update(['Trang_thai' => 'Hoan_thanh']);
            }

            return $delivery;
        });

        return $this->successResponse(
            'Cập nhật điều phối giao hàng thành công.',
            [
                'delivery_id' => (int) $delivery->Ma_giao_hang,
                'order_id' => (int) $delivery->Ma_don_hang,
                'carrier' => $delivery->Don_vi_van_chuyen,
                'tracking_number' => $delivery->Ma_van_don,
                'status' => $delivery->Trang_thai,
                'shipped_at' => $delivery->Ngay_xuat_giao,
                'delivered_at' => $delivery->Ngay_giao_thanh_cong,
            ]
        );
    }
}