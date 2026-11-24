<?php

/*
 * Luồng Quản trị viên (Admin): Quản lý danh sách sản phẩm nông sản (san_pham & hinh_anh_san_pham).
 */

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HinhAnhSanPham;
use App\Models\NongTrai;
use App\Models\SanPham;
use App\Services\R2StorageService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Throwable;

class ProductController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected R2StorageService $r2Service
    ) {}

    /**
     * GET /api/admin/products
     * Lấy danh sách sản phẩm kèm tồn kho FEFO khả dụng, giá bán hiện tại & danh sách hình ảnh.
     */
    public function index(Request $request): JsonResponse
    {
        $withRelations = [
            'danhMuc:Ma_danh_muc,Ten_danh_muc',
            'nongTrai:Ma_nong_trai,Ten_nong_trai',
        ];
        if ($this->hasGalleryTable()) {
            $withRelations[] = 'hinhAnhs';
        }

        $query = SanPham::query()
            ->with($withRelations)
            ->withCount('chungNhans')
            ->select('san_pham.*')
            ->selectRaw('fn_ton_kho_kha_dung(san_pham.Ma_san_pham) as available_stock')
            ->selectRaw('fn_gia_ban_hien_tai(san_pham.Ma_san_pham) as current_price')
            ->orderByDesc('Ma_san_pham');

        if ($request->filled('category_id') && $request->query('category_id') !== 'ALL') {
            $query->where('Ma_danh_muc', (int) $request->query('category_id'));
        }

        if ($request->filled('status') && $request->query('status') !== 'ALL') {
            $query->where('Trang_thai', $request->query('status'));
        }

        if ($request->filled('search')) {
            $kw = trim((string) $request->query('search'));
            $query->where(function ($q) use ($kw) {
                $q->where('Ten_san_pham', 'like', "%{$kw}%")
                    ->orWhere('Don_vi_tinh', 'like', "%{$kw}%")
                    ->orWhere('Ma_san_pham', $kw);
            });
        }

        $products = $query->get()
            ->map(fn (SanPham $sp) => $this->formatProduct($sp))
            ->values();

        return $this->successResponse(
            message: 'Lấy danh sách sản phẩm thành công.',
            data: $products
        );
    }

    /**
     * POST /api/admin/products
     * Thêm mới sản phẩm nông sản kèm bộ sưu tập nhiều ảnh.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'Ma_danh_muc'       => ['required', 'integer', 'exists:danh_muc,Ma_danh_muc'],
            'Ten_san_pham'      => ['required', 'string', 'min:2', 'max:200'],
            'Mo_ta'             => ['nullable', 'string', 'max:3000'],
            'Don_vi_tinh'       => ['required', 'string', 'max:50'],
            'Gia_ban'           => ['required', 'numeric', 'min:1000', 'max:999999999'],
            'Ty_le_tich_diem'   => ['nullable', 'numeric', 'min:0', 'max:50'],
            'Trang_thai'        => ['nullable', 'string', Rule::in(['Dang_ban', 'Tam_ngung'])],
            'image'             => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'image_url'         => ['nullable', 'string', 'max:500'],
            'images'            => ['nullable', 'array', 'max:10'],
            'images.*'          => ['file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'gallery_urls'      => ['nullable', 'array', 'max:10'],
            'gallery_urls.*'    => ['nullable', 'string', 'max:500'],
        ], [
            'Ma_danh_muc.required'  => 'Vui lòng chọn danh mục nông sản.',
            'Ten_san_pham.required' => 'Vui lòng nhập tên sản phẩm.',
            'Don_vi_tinh.required'  => 'Vui lòng nhập đơn vị tính (kg, bó 200g, hộp 500g...).',
            'Gia_ban.required'      => 'Vui lòng nhập giá bán niêm yết.',
            'Gia_ban.min'           => 'Giá bán tối thiểu từ 1.000đ.',
            'image.mimes'           => 'Ảnh đại diện chỉ hỗ trợ JPG, PNG hoặc WEBP.',
            'images.*.mimes'        => 'Các ảnh sản phẩm chỉ hỗ trợ JPG, PNG hoặc WEBP.',
        ]);

        $uploadedPaths = $this->collectIncomingImagePaths($request, $validated);
        $primaryImage = $uploadedPaths[0] ?? null;
        $farmId = NongTrai::query()->value('Ma_nong_trai') ?? 1;

        $product = DB::transaction(function () use ($validated, $farmId, $primaryImage, $uploadedPaths): SanPham {
            $sp = SanPham::create([
                'Ma_danh_muc'       => (int) $validated['Ma_danh_muc'],
                'Ma_nong_trai'      => $farmId,
                'Ten_san_pham'      => trim($validated['Ten_san_pham']),
                'Mo_ta'             => isset($validated['Mo_ta']) ? trim($validated['Mo_ta']) : null,
                'Don_vi_tinh'       => trim($validated['Don_vi_tinh']),
                'Gia_ban'           => (float) $validated['Gia_ban'],
                'Hinh_anh_dai_dien' => $primaryImage,
                'Ty_le_tich_diem'   => isset($validated['Ty_le_tich_diem']) ? (float) $validated['Ty_le_tich_diem'] : 1.00,
                'Trang_thai'        => $validated['Trang_thai'] ?? 'Dang_ban',
            ]);

            $this->syncGalleryRecords($sp, $uploadedPaths);

            return $sp;
        });

        $fresh = $this->loadFormattedProduct($product->Ma_san_pham);
        $this->clearStorefrontCache();

        return $this->successResponse(
            message: "Đã thêm sản phẩm \"{$product->Ten_san_pham}\" thành công.",
            data: $fresh,
            status: 201
        );
    }

    /**
     * PUT /api/admin/products/{id}
     * Cập nhật thông tin sản phẩm nông sản & đồng bộ danh sách nhiều ảnh.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $product = SanPham::findOrFail($id);

        $validated = $request->validate([
            'Ma_danh_muc'        => ['required', 'integer', 'exists:danh_muc,Ma_danh_muc'],
            'Ten_san_pham'       => ['required', 'string', 'min:2', 'max:200'],
            'Mo_ta'              => ['nullable', 'string', 'max:3000'],
            'Don_vi_tinh'        => ['required', 'string', 'max:50'],
            'Gia_ban'            => ['required', 'numeric', 'min:1000', 'max:999999999'],
            'Ty_le_tich_diem'    => ['nullable', 'numeric', 'min:0', 'max:50'],
            'Trang_thai'         => ['nullable', 'string', Rule::in(['Dang_ban', 'Tam_ngung'])],
            'image'              => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'image_url'          => ['nullable', 'string', 'max:500'],
            'images'             => ['nullable', 'array', 'max:10'],
            'images.*'           => ['file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'gallery_urls'       => ['nullable', 'array', 'max:10'],
            'gallery_urls.*'     => ['nullable', 'string', 'max:500'],
            'retained_images'    => ['nullable', 'array', 'max:10'],
            'retained_images.*'  => ['nullable', 'string', 'max:500'],
        ], [
            'Ma_danh_muc.required'  => 'Vui lòng chọn danh mục nông sản.',
            'Ten_san_pham.required' => 'Vui lòng nhập tên sản phẩm.',
            'Don_vi_tinh.required'  => 'Vui lòng nhập đơn vị tính.',
            'Gia_ban.required'      => 'Vui lòng nhập giá bán niêm yết.',
        ]);

        // Tập hợp ảnh cũ trước khi cập nhật để dọn file đã bị xóa khỏi thư viện
        $previousPaths = $this->getExistingRawPaths($product);

        $hasExplicitRetained = $request->has('retained_images');
        $retainedPaths = $hasExplicitRetained
            ? collect($validated['retained_images'] ?? [])
                ->map(fn ($p) => $this->normalizeIncomingPath((string) $p))
                ->filter()
                ->values()
                ->all()
            : $previousPaths;

        $newlyAddedPaths = $this->collectIncomingImagePaths($request, $validated);

        // Nếu không truyền retained_images nhưng có upload ảnh đại diện mới theo kiểu cũ
        if (! $hasExplicitRetained && ! empty($newlyAddedPaths) && ($request->hasFile('image') || $request->filled('image_url'))) {
            $finalPaths = array_values(array_unique([
                ...$newlyAddedPaths,
                ...array_slice($retainedPaths, 1),
            ]));
        } else {
            $finalPaths = array_values(array_unique([
                ...$retainedPaths,
                ...$newlyAddedPaths,
            ]));
        }

        $finalPaths = array_slice($finalPaths, 0, 10);
        $primaryImage = $finalPaths[0] ?? null;

        DB::transaction(function () use ($product, $validated, $primaryImage, $finalPaths): void {
            $product->update([
                'Ma_danh_muc'       => (int) $validated['Ma_danh_muc'],
                'Ten_san_pham'      => trim($validated['Ten_san_pham']),
                'Mo_ta'             => isset($validated['Mo_ta']) ? trim($validated['Mo_ta']) : null,
                'Don_vi_tinh'       => trim($validated['Don_vi_tinh']),
                'Gia_ban'           => (float) $validated['Gia_ban'],
                'Hinh_anh_dai_dien' => $primaryImage,
                'Ty_le_tich_diem'   => isset($validated['Ty_le_tich_diem']) ? (float) $validated['Ty_le_tich_diem'] : $product->Ty_le_tich_diem,
                'Trang_thai'        => $validated['Trang_thai'] ?? $product->Trang_thai,
            ]);

            $this->syncGalleryRecords($product, $finalPaths);
        });

        // Xóa trên ổ đĩa / R2 những ảnh cũ không còn nằm trong danh sách giữ lại
        foreach ($previousPaths as $oldPath) {
            if (! in_array($oldPath, $finalPaths, true)) {
                $this->deleteProductImage($oldPath);
            }
        }

        $fresh = $this->loadFormattedProduct($product->Ma_san_pham);
        $this->clearStorefrontCache();

        return $this->successResponse(
            message: 'Cập nhật thông tin sản phẩm thành công.',
            data: $fresh
        );
    }

    /**
     * PATCH /api/admin/products/{id}/status
     * Cập nhật nhanh trạng thái mở bán / tạm ngưng.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $product = SanPham::findOrFail($id);

        $validated = $request->validate([
            'Trang_thai' => ['required', 'string', Rule::in(['Dang_ban', 'Tam_ngung'])],
        ]);

        $product->Trang_thai = $validated['Trang_thai'];
        $product->save();

        $fresh = $this->loadFormattedProduct($product->Ma_san_pham);
        $this->clearStorefrontCache();

        return $this->successResponse(
            message: $validated['Trang_thai'] === 'Dang_ban'
                ? "Đã mở bán lại sản phẩm \"{$product->Ten_san_pham}\"."
                : "Đã tạm ngưng bán sản phẩm \"{$product->Ten_san_pham}\".",
            data: $fresh
        );
    }

    /**
     * DELETE /api/admin/products/{id}
     * Xóa sản phẩm (chặn xóa nếu đã có lô canh tác, đơn hàng hoặc gói định kỳ liên kết).
     */
    public function destroy(int $id): JsonResponse
    {
        $product = SanPham::findOrFail($id);

        if (DB::table('lo_canh_tac')->where('Ma_san_pham', $id)->exists()) {
            return $this->errorResponse(
                message: "Không thể xóa \"{$product->Ten_san_pham}\" vì đã có lô canh tác & lô thu hoạch gắn với sản phẩm này. Bạn nên chuyển sang trạng thái 'Tạm ngưng'.",
                status: 409,
                errorCode: self::ERR_CONFLICT
            );
        }

        if (DB::table('chi_tiet_don_hang')->where('Ma_san_pham', $id)->exists()) {
            return $this->errorResponse(
                message: "Không thể xóa \"{$product->Ten_san_pham}\" vì đã phát sinh lịch sử đơn hàng của khách. Bạn nên chuyển sang trạng thái 'Tạm ngưng'.",
                status: 409,
                errorCode: self::ERR_CONFLICT
            );
        }

        if (DB::table('chi_tiet_goi')->where('Ma_san_pham', $id)->exists()) {
            return $this->errorResponse(
                message: "Không thể xóa \"{$product->Ten_san_pham}\" vì đang nằm trong thành phần Gói rau củ định kỳ.",
                status: 409,
                errorCode: self::ERR_CONFLICT
            );
        }

        $oldPaths = $this->getExistingRawPaths($product);
        $product->delete();

        foreach ($oldPaths as $oldPath) {
            $this->deleteProductImage($oldPath);
        }

        $this->clearStorefrontCache();

        return $this->successResponse(message: 'Đã xóa sản phẩm nông sản thành công.');
    }

    private function loadFormattedProduct(int $productId): array
    {
        $withRelations = [
            'danhMuc:Ma_danh_muc,Ten_danh_muc',
            'nongTrai:Ma_nong_trai,Ten_nong_trai',
        ];
        if ($this->hasGalleryTable()) {
            $withRelations[] = 'hinhAnhs';
        }

        $sp = SanPham::with($withRelations)
            ->withCount('chungNhans')
            ->select('san_pham.*')
            ->selectRaw('fn_ton_kho_kha_dung(san_pham.Ma_san_pham) as available_stock')
            ->selectRaw('fn_gia_ban_hien_tai(san_pham.Ma_san_pham) as current_price')
            ->findOrFail($productId);

        return $this->formatProduct($sp);
    }

    private function formatProduct(SanPham $sp): array
    {
        $rawPaths = $this->getExistingRawPaths($sp);
        $gallery = [];

        foreach ($rawPaths as $idx => $path) {
            $url = $this->toPublicUrl($path);
            if ($url !== null) {
                $gallery[] = [
                    'path'       => $path,
                    'url'        => $url,
                    'is_primary' => $idx === 0,
                ];
            }
        }

        $primaryPath = $rawPaths[0] ?? '';
        $primaryUrl = $gallery[0]['url'] ?? null;

        return [
            'id'                 => (int) $sp->Ma_san_pham,
            'category_id'        => (int) $sp->Ma_danh_muc,
            'category_name'      => $sp->danhMuc?->Ten_danh_muc ?? 'Chưa phân loại',
            'farm_id'            => (int) $sp->Ma_nong_trai,
            'farm_name'          => $sp->nongTrai?->Ten_nong_trai ?? 'Nông Trại XanhFarm',
            'name'               => $sp->Ten_san_pham,
            'description'        => $sp->Mo_ta,
            'unit'               => $sp->Don_vi_tinh,
            'price'              => (float) $sp->Gia_ban,
            'current_price'      => (float) ($sp->current_price ?? $sp->Gia_ban),
            'available_stock'    => (float) ($sp->available_stock ?? 0),
            'reward_point_rate'  => (float) $sp->Ty_le_tich_diem,
            'image_path'         => $primaryPath,
            'image_url'          => $primaryUrl,
            'images'             => $gallery,
            'status'             => $sp->Trang_thai,
            'status_label'       => $sp->Trang_thai === 'Dang_ban' ? 'Đang mở bán' : 'Tạm ngưng',
            'certificates_count' => (int) ($sp->chung_nhans_count ?? 0),
            'created_at'         => $sp->created_at?->toISOString(),
        ];
    }

    private function collectIncomingImagePaths(Request $request, array $validated): array
    {
        $paths = [];

        if ($request->hasFile('image') && $request->file('image')->isValid()) {
            $paths[] = $this->storeUploadedFile($request->file('image'));
        }

        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                if ($file instanceof UploadedFile && $file->isValid()) {
                    $paths[] = $this->storeUploadedFile($file);
                }
            }
        }

        if (! empty($validated['image_url'])) {
            $normalized = $this->normalizeIncomingPath((string) $validated['image_url']);
            if ($normalized !== '') {
                $paths[] = $normalized;
            }
        }

        if (! empty($validated['gallery_urls']) && is_array($validated['gallery_urls'])) {
            foreach ($validated['gallery_urls'] as $rawUrl) {
                $normalized = $this->normalizeIncomingPath((string) $rawUrl);
                if ($normalized !== '') {
                    $paths[] = $normalized;
                }
            }
        }

        return array_values(array_unique(array_filter($paths)));
    }

    private function storeUploadedFile(UploadedFile $file): string
    {
        try {
            $uploaded = $this->r2Service->upload($file, R2StorageService::FOLDER_PRODUCTS);
            return $uploaded['url'];
        } catch (Throwable $e) {
            Log::warning('R2 product image upload failed, falling back to local public disk: ' . $e->getMessage());
            $ext = strtolower($file->getClientOriginalExtension() ?: 'webp');
            $filename = 'prod_' . now()->format('Ymd_His') . '_' . Str::random(8) . '.' . $ext;
            $localPath = Storage::disk('public')->putFileAs('uploads/products', $file, $filename);
            return '/storage/' . $localPath;
        }
    }

    private function getExistingRawPaths(SanPham $sp): array
    {
        $paths = [];

        if ($sp->Hinh_anh_dai_dien) {
            $paths[] = trim((string) $sp->Hinh_anh_dai_dien);
        }

        if ($this->hasGalleryTable()) {
            $rows = $sp->relationLoaded('hinhAnhs')
                ? $sp->hinhAnhs
                : $sp->hinhAnhs()->get();

            foreach ($rows as $row) {
                if ($row->Duong_dan) {
                    $paths[] = trim((string) $row->Duong_dan);
                }
            }
        }

        return array_values(array_unique(array_filter($paths)));
    }

    private function syncGalleryRecords(SanPham $sp, array $paths): void
    {
        if (! $this->hasGalleryTable()) {
            return;
        }

        HinhAnhSanPham::query()->where('Ma_san_pham', $sp->Ma_san_pham)->delete();

        foreach (array_values($paths) as $index => $path) {
            HinhAnhSanPham::query()->create([
                'Ma_san_pham'  => $sp->Ma_san_pham,
                'Duong_dan'    => $path,
                'Thu_tu'       => $index,
                'La_anh_chinh' => $index === 0,
            ]);
        }
    }

    private function normalizeIncomingPath(string $raw): string
    {
        $trimmed = trim($raw);
        if ($trimmed === '') {
            return '';
        }

        $appUrl = rtrim((string) config('app.url'), '/');
        if ($appUrl !== '' && str_starts_with($trimmed, $appUrl . '/storage/')) {
            return substr($trimmed, strlen($appUrl));
        }

        return $trimmed;
    }

    private function toPublicUrl(?string $rawPath): ?string
    {
        if (! $rawPath) {
            return null;
        }

        if (str_starts_with($rawPath, 'http://') || str_starts_with($rawPath, 'https://')) {
            return $rawPath;
        }

        return url($rawPath);
    }

    private function hasGalleryTable(): bool
    {
        static $exists = null;
        if ($exists === null) {
            $exists = Schema::hasTable('hinh_anh_san_pham');
        }
        return $exists;
    }

    private function deleteProductImage(?string $pathOrUrl): void
    {
        if (! $pathOrUrl) {
            return;
        }

        if (str_starts_with($pathOrUrl, '/storage/uploads/products/')) {
            $relative = ltrim(substr($pathOrUrl, strlen('/storage/')), '/');
            if (Storage::disk('public')->exists($relative)) {
                Storage::disk('public')->delete($relative);
            }
            return;
        }

        try {
            $this->r2Service->delete($pathOrUrl);
        } catch (Throwable) {
            // Bỏ qua nếu là URL mẫu tĩnh
        }
    }

    private function clearStorefrontCache(): void
    {
        Cache::forget('public_catalog_products_v1');
        Cache::forget('public_catalog_products_v2');
        Cache::forget('public_categories_list');
        Cache::forget('public_active_flash_sales_v1');
    }
}