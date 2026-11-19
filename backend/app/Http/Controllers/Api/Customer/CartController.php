<?php

/*
 * Luồng khách hàng: quản lý giỏ hàng và kiểm tra tồn kho theo lô.
 */

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\SanPham;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CartController extends Controller
{
    use ApiResponse;

    public function storeItem(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'product_id' => ['required', 'integer', 'min:1'],
            'quantity'   => ['required', 'integer', 'min:1'],
        ]);

        if ($validator->fails()) {
            return $this->errorResponse(
                message: 'Thông tin sản phẩm hoặc số lượng không hợp lệ.',
                status: 422,
                errorCode: self::ERR_VALIDATION,
                errors: $validator->errors()
            );
        }

        $productId = (int) $validator->validated()['product_id'];
        $quantity = (int) $validator->validated()['quantity'];
        $userId = (int) $request->user()->getAuthIdentifier();

        return DB::transaction(function () use ($productId, $quantity, $userId): JsonResponse {
            DB::table('nguoi_dung')
                ->where('Ma_nguoi_dung', $userId)
                ->lockForUpdate()
                ->first();

            $product = SanPham::query()
                ->where('Ma_san_pham', $productId)
                ->where('Trang_thai', 'Dang_ban')
                ->lockForUpdate()
                ->first();

            if (! $product) {
                return $this->errorResponse(
                    message: 'Sản phẩm không tồn tại hoặc hiện đã tạm ngưng bán.',
                    status: 404,
                    errorCode: self::ERR_NOT_FOUND
                );
            }

            $batches = DB::table('lo_hang as lh')
                ->join('lo_canh_tac as lct', 'lct.Ma_lo_canh_tac', '=', 'lh.Ma_lo_canh_tac')
                ->where('lct.Ma_san_pham', $productId)
                ->whereIn('lh.Trang_thai', ['Con_hang', 'Sap_het_han'])
                ->where('lh.So_luong_con_lai', '>', 0)
                ->where('lh.Han_su_dung', '>=', now()->toDateString())
                ->select(['lh.Ma_lo_hang', 'lh.So_luong_con_lai'])
                ->lockForUpdate()
                ->get();

            $availableStock = round(
                $batches->sum(fn ($batch) => (float) $batch->So_luong_con_lai),
                2
            );

            $cart = DB::table('gio_hang')
                ->where('Ma_nguoi_dung', $userId)
                ->lockForUpdate()
                ->first();
            $cartItem = $cart
                ? DB::table('chi_tiet_gio_hang')
                    ->where('Ma_gio_hang', $cart->Ma_gio_hang)
                    ->where('Ma_san_pham', $productId)
                    ->lockForUpdate()
                    ->first()
                : null;
            $updatedQuantity = round((float) ($cartItem->So_luong ?? 0) + $quantity, 2);

            if ($updatedQuantity > $availableStock) {
                return $this->errorResponse(
                    message: 'Số lượng yêu cầu vượt quá tồn kho khả dụng.',
                    status: 422,
                    errorCode: self::ERR_VALIDATION,
                    errors: [
                        'quantity' => ['Số lượng tối đa có thể thêm là '.max(0, (int) floor($availableStock - (float) ($cartItem->So_luong ?? 0))).'.'],
                    ]
                );
            }

            $now = now();
            $cartId = $cart
                ? (int) $cart->Ma_gio_hang
                : (int) DB::table('gio_hang')->insertGetId([
                    'Ma_nguoi_dung' => $userId,
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ]);

            if ($cartItem) {
                DB::table('chi_tiet_gio_hang')
                    ->where('Ma_ct_gio_hang', $cartItem->Ma_ct_gio_hang)
                    ->update([
                        'So_luong'  => $updatedQuantity,
                        'updated_at' => $now,
                    ]);
            } else {
                DB::table('chi_tiet_gio_hang')->insert([
                    'Ma_gio_hang'  => $cartId,
                    'Ma_san_pham'  => $productId,
                    'So_luong'     => $updatedQuantity,
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ]);
            }

            $cartCount = (float) DB::table('chi_tiet_gio_hang')
                ->where('Ma_gio_hang', $cartId)
                ->sum('So_luong');

            return $this->successResponse(
                message: 'Đã thêm sản phẩm vào giỏ hàng.',
                data: [
                    'product_id'      => $productId,
                    'quantity'        => $updatedQuantity,
                    'available_stock' => $availableStock,
                    'cart_count'       => $cartCount,
                ]
            );
        });
    }
}
