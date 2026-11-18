<?php

/*
 * Luồng Quản trị viên (Admin): Quản lý danh mục nông sản (danh_muc).
 */

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\DanhMuc;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/categories
     * Lấy danh sách danh mục nông sản kèm thống kê số lượng sản phẩm trực thuộc.
     */
    public function index(): JsonResponse
    {
        $hasStatusCol = Schema::hasColumn('danh_muc', 'Trang_thai');

        $categories = DanhMuc::query()
            ->withCount([
                'sanPhams as total_products_count',
                'sanPhams as active_products_count' => fn ($q) => $q->where('Trang_thai', 'Dang_ban'),
            ])
            ->orderBy('Ma_danh_muc', 'asc')
            ->get()
            ->map(fn (DanhMuc $cat) => $this->formatCategory($cat, $hasStatusCol))
            ->values();

        return $this->successResponse(
            message: 'Lấy danh sách danh mục thành công.',
            data: $categories
        );
    }

    /**
     * POST /api/admin/categories
     * Thêm mới danh mục nông sản.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'Ten_danh_muc' => ['required', 'string', 'min:2', 'max:150', 'unique:danh_muc,Ten_danh_muc'],
            'Mo_ta'        => ['nullable', 'string', 'max:1000'],
            'Trang_thai'   => ['nullable', 'string', Rule::in(['Hoat_dong', 'Tam_an'])],
        ], [
            'Ten_danh_muc.required' => 'Vui lòng nhập tên danh mục nông sản.',
            'Ten_danh_muc.min'      => 'Tên danh mục phải có ít nhất 2 ký tự.',
            'Ten_danh_muc.unique'   => 'Tên danh mục này đã tồn tại trên hệ thống.',
        ]);

        $hasStatusCol = Schema::hasColumn('danh_muc', 'Trang_thai');
        $payload = [
            'Ten_danh_muc' => trim($validated['Ten_danh_muc']),
            'Mo_ta'        => isset($validated['Mo_ta']) ? trim($validated['Mo_ta']) : null,
        ];

        if ($hasStatusCol) {
            $payload['Trang_thai'] = $validated['Trang_thai'] ?? 'Hoat_dong';
        }

        $category = DanhMuc::create($payload);
        $category->total_products_count = 0;
        $category->active_products_count = 0;

        $this->clearStorefrontCache();

        return $this->successResponse(
            message: 'Thêm danh mục nông sản thành công.',
            data: $this->formatCategory($category, $hasStatusCol),
            status: 201
        );
    }

    /**
     * PUT /api/admin/categories/{id}
     * Cập nhật thông tin danh mục nông sản.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $category = DanhMuc::findOrFail($id);

        $validated = $request->validate([
            'Ten_danh_muc' => [
                'required',
                'string',
                'min:2',
                'max:150',
                Rule::unique('danh_muc', 'Ten_danh_muc')->ignore($category->Ma_danh_muc, 'Ma_danh_muc'),
            ],
            'Mo_ta'        => ['nullable', 'string', 'max:1000'],
            'Trang_thai'   => ['nullable', 'string', Rule::in(['Hoat_dong', 'Tam_an'])],
        ], [
            'Ten_danh_muc.required' => 'Vui lòng nhập tên danh mục nông sản.',
            'Ten_danh_muc.unique'   => 'Tên danh mục này đã tồn tại trên hệ thống.',
        ]);

        $hasStatusCol = Schema::hasColumn('danh_muc', 'Trang_thai');
        $category->Ten_danh_muc = trim($validated['Ten_danh_muc']);
        $category->Mo_ta = isset($validated['Mo_ta']) ? trim($validated['Mo_ta']) : null;

        if ($hasStatusCol && ! empty($validated['Trang_thai'])) {
            $category->Trang_thai = $validated['Trang_thai'];
        }

        $category->save();
        $category->loadCount([
            'sanPhams as total_products_count',
            'sanPhams as active_products_count' => fn ($q) => $q->where('Trang_thai', 'Dang_ban'),
        ]);

        $this->clearStorefrontCache();

        return $this->successResponse(
            message: 'Cập nhật danh mục thành công.',
            data: $this->formatCategory($category, $hasStatusCol)
        );
    }

    /**
     * PATCH /api/admin/categories/{id}/status
     * Cập nhật nhanh trạng thái danh mục (Hoạt động / Tạm ẩn).
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        if (! Schema::hasColumn('danh_muc', 'Trang_thai')) {
            return $this->errorResponse(
                message: 'Vui lòng chạy lệnh php artisan migrate để kích hoạt cột trạng thái danh mục.',
                status: 422
            );
        }

        $category = DanhMuc::findOrFail($id);
        $validated = $request->validate([
            'Trang_thai' => ['required', 'string', Rule::in(['Hoat_dong', 'Tam_an'])],
        ]);

        $category->Trang_thai = $validated['Trang_thai'];
        $category->save();

        $category->loadCount([
            'sanPhams as total_products_count',
            'sanPhams as active_products_count' => fn ($q) => $q->where('Trang_thai', 'Dang_ban'),
        ]);

        $this->clearStorefrontCache();

        return $this->successResponse(
            message: 'Đã cập nhật trạng thái danh mục.',
            data: $this->formatCategory($category, true)
        );
    }

    /**
     * DELETE /api/admin/categories/{id}
     * Xóa danh mục (chặn xóa nếu đang có sản phẩm trực thuộc).
     */
    public function destroy(int $id): JsonResponse
    {
        $category = DanhMuc::withCount('sanPhams')->findOrFail($id);

        if ($category->san_phams_count > 0) {
            return $this->errorResponse(
                message: "Không thể xóa danh mục \"{$category->Ten_danh_muc}\" vì đang có {$category->san_phams_count} sản phẩm trực thuộc. Hãy chuyển sản phẩm sang danh mục khác trước.",
                status: 409,
                errorCode: self::ERR_CONFLICT
            );
        }

        $category->delete();
        $this->clearStorefrontCache();

        return $this->successResponse(message: 'Đã xóa danh mục nông sản thành công.');
    }

    private function formatCategory(DanhMuc $cat, bool $hasStatusCol): array
    {
        $status = $hasStatusCol ? ($cat->Trang_thai ?? 'Hoat_dong') : 'Hoat_dong';

        return [
            'id'                    => (int) $cat->Ma_danh_muc,
            'name'                  => $cat->Ten_danh_muc,
            'description'           => $cat->Mo_ta,
            'status'                => $status,
            'status_label'          => $status === 'Hoat_dong' ? 'Hoạt động' : 'Tạm ẩn',
            'total_products_count'  => (int) ($cat->total_products_count ?? 0),
            'active_products_count' => (int) ($cat->active_products_count ?? 0),
            'created_at'            => $cat->created_at?->toISOString(),
        ];
    }

    private function clearStorefrontCache(): void
    {
        Cache::forget('public_catalog_products_v1');
        Cache::forget('public_categories_list');
    }
}