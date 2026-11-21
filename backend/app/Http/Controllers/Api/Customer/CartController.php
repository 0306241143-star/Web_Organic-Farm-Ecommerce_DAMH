<?php

/*
 * Luồng khách hàng: quản lý giỏ hàng và kiểm tra tồn kho theo lô.
 */

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\GioHang;
use App\Models\SanPham;
use App\Services\CartPricingService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class CartController extends Controller
{
    use ApiResponse;

    /**
     * Lấy giỏ gắn với tài khoản đang đăng nhập; giỏ được tạo lần đầu nếu chưa tồn tại.
     */
    public function index(Request $request, CartPricingService $pricing): JsonResponse
    {
        $cart = $this->getOrCreateCart((int) $request->user()->getAuthIdentifier());

        return $this->successResponse(
            message: 'Lấy giỏ hàng thành công.',
            data: $this->formatCart($cart, $pricing)
        );
    }

    /**
     * Thêm mặt hàng mới hoặc cộng số lượng vào dòng sản phẩm đã có trong giỏ.
     */
    public function store(Request $request, CartPricingService $pricing): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'min:1'],
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:99999999'],
        ]);

        $userId = (int) $request->user()->getAuthIdentifier();
        $quantity = (float) ($validated['quantity'] ?? 1);

        DB::transaction(function () use ($validated, $userId, $quantity, $pricing): void {
            $cart = $this->getOrCreateCart($userId, lock: true);
            $product = SanPham::query()
                ->whereKey($validated['product_id'])
                ->lockForUpdate()
                ->first();

            if (! $product || $product->Trang_thai !== 'Dang_ban') {
                throw ValidationException::withMessages([
                    'product_id' => 'Sản phẩm không tồn tại hoặc hiện không mở bán.',
                ]);
            }

            $item = $cart->chiTiets()
                ->where('Ma_san_pham', $product->Ma_san_pham)
                ->lockForUpdate()
                ->first();
            $newQuantity = $quantity + (float) ($item?->So_luong ?? 0);
            $availableStock = $pricing->availableStockFor([(int) $product->Ma_san_pham])
                ->get((int) $product->Ma_san_pham, 0.0);

            // Giỏ hàng không giữ chỗ tồn kho; luôn kiểm tra lại số khả dụng khi thêm và cập nhật.
            if ($newQuantity > $availableStock) {
                throw ValidationException::withMessages([
                    'quantity' => "Số lượng vượt quá tồn kho khả dụng ({$availableStock}).",
                ]);
            }

            if ($item) {
                $item->update(['So_luong' => $newQuantity]);
            } else {
                $cart->chiTiets()->create([
                    'Ma_san_pham' => $product->Ma_san_pham,
                    'So_luong' => $newQuantity,
                ]);
            }
        });

        return $this->cartMutationResponse($userId, 'Đã thêm sản phẩm vào giỏ hàng.', $pricing);
    }

    /**
     * Ghi đè số lượng của một mặt hàng; productId luôn được tìm trong giỏ của chính user.
     */
    public function update(Request $request, int $productId, CartPricingService $pricing): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:99999999'],
        ]);

        $userId = (int) $request->user()->getAuthIdentifier();
        $quantity = (float) $validated['quantity'];

        DB::transaction(function () use ($productId, $userId, $quantity, $pricing): void {
            $cart = $this->getOrCreateCart($userId, lock: true);
            $item = $cart->chiTiets()
                ->where('Ma_san_pham', $productId)
                ->lockForUpdate()
                ->first();

            if (! $item) {
                abort(404, 'Sản phẩm không có trong giỏ hàng.');
            }

            $product = $item->sanPham()->lockForUpdate()->first();
            if (! $product || $product->Trang_thai !== 'Dang_ban') {
                throw ValidationException::withMessages([
                    'product_id' => 'Sản phẩm không còn mở bán. Vui lòng xóa sản phẩm khỏi giỏ hàng.',
                ]);
            }

            $availableStock = $pricing->availableStockFor([$productId])->get($productId, 0.0);
            if ($quantity > $availableStock) {
                throw ValidationException::withMessages([
                    'quantity' => "Số lượng vượt quá tồn kho khả dụng ({$availableStock}).",
                ]);
            }

            $item->update(['So_luong' => $quantity]);
        });

        return $this->cartMutationResponse($userId, 'Đã cập nhật số lượng sản phẩm.', $pricing);
    }

    /**
     * Xóa một mặt hàng khỏi giỏ riêng của user hiện tại.
     */
    public function destroy(Request $request, int $productId, CartPricingService $pricing): JsonResponse
    {
        $userId = (int) $request->user()->getAuthIdentifier();
        $cart = $this->getOrCreateCart($userId);
        $deleted = $cart->chiTiets()->where('Ma_san_pham', $productId)->delete();

        if ($deleted === 0) {
            abort(404, 'Sản phẩm không có trong giỏ hàng.');
        }

        return $this->cartMutationResponse($userId, 'Đã xóa sản phẩm khỏi giỏ hàng.', $pricing);
    }

    private function cartMutationResponse(
        int $userId,
        string $message,
        CartPricingService $pricing
    ): JsonResponse {
        return $this->successResponse(
            message: $message,
            data: $this->formatCart($this->getOrCreateCart($userId), $pricing)
        );
    }

    private function getOrCreateCart(int $userId, bool $lock = false): GioHang
    {
        $query = GioHang::query()->where('Ma_nguoi_dung', $userId);
        if ($lock) {
            $query->lockForUpdate();
        }

        return $query->firstOrCreate(['Ma_nguoi_dung' => $userId]);
    }

    /**
     * Trả dữ liệu hiển thị đã tính ở server, không tin giá hay thành tiền từ trình duyệt.
     */
    private function formatCart(GioHang $cart, CartPricingService $pricing): array
    {
        $formattedItems = collect($pricing->priceCart($cart))->map(function (array $item): array {
            $product = $item['product'];

            return [
                'id' => $item['id'],
                'name' => $product->Ten_san_pham,
                'unit' => $product->Don_vi_tinh,
                'price' => $item['price'],
                'quantity' => $item['quantity'],
                'line_total' => $item['line_total'],
                'image_url' => $this->resolveImageUrl($product->Hinh_anh_dai_dien),
                'available_stock' => $item['available_stock'],
                'is_available' => $item['is_available'],
            ];
        });

        return [
            'items' => $formattedItems,
            'item_count' => (float) $formattedItems->sum('quantity'),
            'subtotal' => round((float) $formattedItems->sum('line_total'), 2),
        ];
    }

    private function resolveImageUrl(?string $rawPath): ?string
    {
        if (! $rawPath) {
            return null;
        }

        $path = trim($rawPath);
        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        $relativePath = ltrim($path, '/');
        if (Str::startsWith($relativePath, 'storage/')) {
            $diskPath = Str::after($relativePath, 'storage/');

            return Storage::disk('public')->exists($diskPath) ? asset($relativePath) : null;
        }

        return file_exists(public_path($relativePath)) ? asset($relativePath) : null;
    }
}
