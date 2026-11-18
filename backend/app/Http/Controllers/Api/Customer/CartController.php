<?php

/*
 * Luồng khách hàng: quản lý giỏ hàng và kiểm tra tồn kho theo lô.
 */

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\ChiTietGioHang;
use App\Models\GioHang;
use App\Models\SanPham;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
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
    public function index(Request $request): JsonResponse
    {
        $cart = $this->getOrCreateCart((int) $request->user()->getAuthIdentifier());

        return $this->successResponse(
            message: 'Lấy giỏ hàng thành công.',
            data: $this->formatCart($cart)
        );
    }

    /**
     * Thêm mặt hàng mới hoặc cộng số lượng vào dòng sản phẩm đã có trong giỏ.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'min:1'],
            'quantity' => ['sometimes', 'numeric', 'decimal:0,2', 'min:0.01', 'max:99999999.99'],
        ]);

        $userId = (int) $request->user()->getAuthIdentifier();
        $quantity = (float) ($validated['quantity'] ?? 1);

        DB::transaction(function () use ($validated, $userId, $quantity): void {
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
            $availableStock = $this->availableStockFor([(int) $product->Ma_san_pham])
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

        return $this->cartMutationResponse($userId, 'Đã thêm sản phẩm vào giỏ hàng.');
    }

    /**
     * Ghi đè số lượng của một mặt hàng; productId luôn được tìm trong giỏ của chính user.
     */
    public function update(Request $request, int $productId): JsonResponse
    {
        $validated = $request->validate([
            'quantity' => ['required', 'numeric', 'decimal:0,2', 'min:0.01', 'max:99999999.99'],
        ]);

        $userId = (int) $request->user()->getAuthIdentifier();
        $quantity = (float) $validated['quantity'];

        DB::transaction(function () use ($productId, $userId, $quantity): void {
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

            $availableStock = $this->availableStockFor([$productId])->get($productId, 0.0);
            if ($quantity > $availableStock) {
                throw ValidationException::withMessages([
                    'quantity' => "Số lượng vượt quá tồn kho khả dụng ({$availableStock}).",
                ]);
            }

            $item->update(['So_luong' => $quantity]);
        });

        return $this->cartMutationResponse($userId, 'Đã cập nhật số lượng sản phẩm.');
    }

    /**
     * Xóa một mặt hàng khỏi giỏ riêng của user hiện tại.
     */
    public function destroy(Request $request, int $productId): JsonResponse
    {
        $userId = (int) $request->user()->getAuthIdentifier();
        $cart = $this->getOrCreateCart($userId);
        $deleted = $cart->chiTiets()->where('Ma_san_pham', $productId)->delete();

        if ($deleted === 0) {
            abort(404, 'Sản phẩm không có trong giỏ hàng.');
        }

        return $this->cartMutationResponse($userId, 'Đã xóa sản phẩm khỏi giỏ hàng.');
    }

    private function cartMutationResponse(int $userId, string $message): JsonResponse
    {
        return $this->successResponse(
            message: $message,
            data: $this->formatCart($this->getOrCreateCart($userId))
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
    private function formatCart(GioHang $cart): array
    {
        $cart->load('chiTiets.sanPham');
        $items = $cart->chiTiets->filter(fn (ChiTietGioHang $item) => $item->sanPham !== null)->values();
        $productIds = $items->pluck('Ma_san_pham')->map(fn ($id) => (int) $id)->all();
        $stocks = $this->availableStockFor($productIds);
        $salePrices = $this->activeSalePricesFor($productIds);

        $formattedItems = $items->map(function (ChiTietGioHang $item) use ($stocks, $salePrices): array {
            $product = $item->sanPham;
            $productId = (int) $product->Ma_san_pham;
            $stock = (float) $stocks->get($productId, 0);
            $regularPrice = (float) $product->Gia_ban;
            $price = (float) $salePrices->get($productId, $regularPrice);
            $quantity = (float) $item->So_luong;

            return [
                'id' => $productId,
                'name' => $product->Ten_san_pham,
                'unit' => $product->Don_vi_tinh,
                'price' => $price,
                'quantity' => $quantity,
                'line_total' => round($price * $quantity, 2),
                'image_url' => $this->resolveImageUrl($product->Hinh_anh_dai_dien),
                'available_stock' => $stock,
                'is_available' => $product->Trang_thai === 'Dang_ban' && $stock >= $quantity,
            ];
        });

        return [
            'items' => $formattedItems,
            'item_count' => (float) $formattedItems->sum('quantity'),
            'subtotal' => round((float) $formattedItems->sum('line_total'), 2),
        ];
    }

    private function availableStockFor(array $productIds): Collection
    {
        if ($productIds === []) {
            return collect();
        }

        // Dùng cùng điều kiện lô FEFO còn hạn mà trang danh mục sử dụng.
        return DB::table('lo_hang as lh')
            ->join('lo_canh_tac as lct', 'lct.Ma_lo_canh_tac', '=', 'lh.Ma_lo_canh_tac')
            ->whereIn('lct.Ma_san_pham', $productIds)
            ->whereIn('lh.Trang_thai', ['Con_hang', 'Sap_het_han'])
            ->whereDate('lh.Han_su_dung', '>=', now()->toDateString())
            ->where('lh.So_luong_con_lai', '>', 0)
            ->groupBy('lct.Ma_san_pham')
            ->selectRaw('lct.Ma_san_pham, SUM(lh.So_luong_con_lai) as available_stock')
            ->pluck('available_stock', 'Ma_san_pham')
            ->map(fn ($stock) => (float) $stock);
    }

    private function activeSalePricesFor(array $productIds): Collection
    {
        if ($productIds === []) {
            return collect();
        }

        // Giá Flash Sale chỉ áp dụng khi chương trình đang chạy, còn quota và lô còn hạn/tồn.
        return DB::table('chi_tiet_flash_sale as ctfs')
            ->join('chuong_trinh_flash_sale as fs', 'fs.Ma_flash_sale', '=', 'ctfs.Ma_flash_sale')
            ->join('lo_hang as lh', 'lh.Ma_lo_hang', '=', 'ctfs.Ma_lo_hang')
            ->join('lo_canh_tac as lct', 'lct.Ma_lo_canh_tac', '=', 'lh.Ma_lo_canh_tac')
            ->join('san_pham as sp', 'sp.Ma_san_pham', '=', 'lct.Ma_san_pham')
            ->whereIn('sp.Ma_san_pham', $productIds)
            ->where('fs.Trang_thai', 'Dang_dien_ra')
            ->where('fs.Thoi_gian_bat_dau', '<=', now())
            ->where('fs.Thoi_gian_ket_thuc', '>=', now())
            ->whereColumn('ctfs.So_luong_da_ban', '<', 'ctfs.So_luong_gioi_han')
            ->where('ctfs.Gia_giam', '>', 0)
            ->whereIn('lh.Trang_thai', ['Con_hang', 'Sap_het_han'])
            ->whereDate('lh.Han_su_dung', '>=', now()->toDateString())
            ->where('lh.So_luong_con_lai', '>', 0)
            ->whereColumn('ctfs.Gia_giam', '<', 'sp.Gia_ban')
            ->groupBy('sp.Ma_san_pham')
            ->selectRaw('sp.Ma_san_pham, MIN(ctfs.Gia_giam) as sale_price')
            ->pluck('sale_price', 'Ma_san_pham')
            ->map(fn ($price) => (float) $price);
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
