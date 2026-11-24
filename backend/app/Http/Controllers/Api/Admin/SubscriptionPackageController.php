<?php

/*
 * Luồng Quản trị viên (Admin): Quản lý gói rau định kỳ (goi_dinh_ky & chi_tiet_goi).
 */

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ChiTietGoi;
use App\Models\DangKyGoi;
use App\Models\GoiDinhKy;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class SubscriptionPackageController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/admin/subscriptions
     * Lấy danh sách tất cả gói rau định kỳ kèm thành phần sản phẩm và số lượt đăng ký.
     */
    public function index(): JsonResponse
    {
        $packages = GoiDinhKy::query()
            ->with(['chiTiets.sanPham'])
            ->withCount('dangKyGois as registrations_count')
            ->orderByDesc('Ma_goi')
            ->get()
            ->map(fn(GoiDinhKy $pkg) => $this->formatPackage($pkg))
            ->values();

        return $this->successResponse(
            message: 'Lấy danh sách gói rau định kỳ thành công.',
            data: $packages
        );
    }

    /**
     * POST /api/admin/subscriptions
     * Thêm mới gói rau định kỳ kèm danh sách sản phẩm trong mỗi lần giao.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $this->validatePackage($request);

        $package = DB::transaction(function () use ($validated): GoiDinhKy {
            $pkg = GoiDinhKy::query()->create([
                'Ten_goi'            => trim($validated['Ten_goi']),
                'Mo_ta'              => isset($validated['Mo_ta']) ? trim($validated['Mo_ta']) : null,
                'Gia_goi'            => (float) $validated['Gia_goi'],
                'Ky_han_thang'       => (int) $validated['Ky_han_thang'],
                'Khoi_luong_moi_lan' => (float) $validated['Khoi_luong_moi_lan'],
                'Trang_thai'         => $validated['Trang_thai'] ?? 'Dang_mo',
            ]);

            foreach ($validated['items'] as $item) {
                ChiTietGoi::query()->create([
                    'Ma_goi'      => $pkg->Ma_goi,
                    'Ma_san_pham' => (int) $item['Ma_san_pham'],
                    'So_luong'    => (float) $item['So_luong'],
                ]);
            }

            return $pkg->load(['chiTiets.sanPham'])->loadCount('dangKyGois as registrations_count');
        });

        $this->clearPublicSubscriptionCache();

        return $this->successResponse(
            message: 'Tạo gói rau định kỳ mới thành công.',
            data: $this->formatPackage($package),
            status: 201
        );
    }

    /**
     * PUT /api/admin/subscriptions/{id}
     * Cập nhật thông tin gói rau định kỳ và danh sách nông sản trong gói.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $package = GoiDinhKy::query()->where('Ma_goi', $id)->first();
        if (! $package) {
            return $this->errorResponse(
                message: 'Không tìm thấy gói rau định kỳ yêu cầu.',
                status: 404,
                errorCode: self::ERR_NOT_FOUND
            );
        }

        $validated = $this->validatePackage($request, $id);

        $updated = DB::transaction(function () use ($package, $validated): GoiDinhKy {
            $package->update([
                'Ten_goi'            => trim($validated['Ten_goi']),
                'Mo_ta'              => isset($validated['Mo_ta']) ? trim($validated['Mo_ta']) : null,
                'Gia_goi'            => (float) $validated['Gia_goi'],
                'Ky_han_thang'       => (int) $validated['Ky_han_thang'],
                'Khoi_luong_moi_lan' => (float) $validated['Khoi_luong_moi_lan'],
                'Trang_thai'         => $validated['Trang_thai'] ?? $package->Trang_thai,
            ]);

            ChiTietGoi::query()->where('Ma_goi', $package->Ma_goi)->delete();

            foreach ($validated['items'] as $item) {
                ChiTietGoi::query()->create([
                    'Ma_goi'      => $package->Ma_goi,
                    'Ma_san_pham' => (int) $item['Ma_san_pham'],
                    'So_luong'    => (float) $item['So_luong'],
                ]);
            }

            return $package->fresh(['chiTiets.sanPham'])->loadCount('dangKyGois as registrations_count');
        });

        $this->clearPublicSubscriptionCache();

        return $this->successResponse(
            message: 'Cập nhật gói rau định kỳ thành công.',
            data: $this->formatPackage($updated)
        );
    }

    /**
     * PATCH /api/admin/subscriptions/{id}/status
     * Bật/tắt trạng thái mở bán của gói rau định kỳ (Dang_mo / Tam_dung).
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $package = GoiDinhKy::query()->where('Ma_goi', $id)->first();
        if (! $package) {
            return $this->errorResponse(
                message: 'Không tìm thấy gói rau định kỳ yêu cầu.',
                status: 404,
                errorCode: self::ERR_NOT_FOUND
            );
        }

        $validated = $request->validate([
            'Trang_thai' => ['required', 'string', Rule::in(['Dang_mo', 'Tam_dung'])],
        ]);

        $package->update(['Trang_thai' => $validated['Trang_thai']]);
        $package->load(['chiTiets.sanPham'])->loadCount('dangKyGois as registrations_count');

        $this->clearPublicSubscriptionCache();

        return $this->successResponse(
            message: 'Cập nhật trạng thái gói rau định kỳ thành công.',
            data: $this->formatPackage($package)
        );
    }

    /**
     * DELETE /api/admin/subscriptions/{id}
     * Xóa gói rau định kỳ nếu chưa có khách hàng nào đăng ký.
     */
    public function destroy(int $id): JsonResponse
    {
        $package = GoiDinhKy::query()->where('Ma_goi', $id)->first();
        if (! $package) {
            return $this->errorResponse(
                message: 'Không tìm thấy gói rau định kỳ yêu cầu.',
                status: 404,
                errorCode: self::ERR_NOT_FOUND
            );
        }

        $hasRegistrations = DangKyGoi::query()->where('Ma_goi', $id)->exists();
        if ($hasRegistrations) {
            return $this->errorResponse(
                message: 'Không thể xóa gói đã có khách hàng đăng ký. Bạn có thể chuyển sang trạng thái Tạm dừng.',
                status: 422,
                errorCode: self::ERR_VALIDATION
            );
        }

        DB::transaction(function () use ($package): void {
            ChiTietGoi::query()->where('Ma_goi', $package->Ma_goi)->delete();
            $package->delete();
        });

        $this->clearPublicSubscriptionCache();

        return $this->successResponse(
            message: 'Xóa gói rau định kỳ thành công.',
            data: ['deleted_id' => $id]
        );
    }

    private function validatePackage(Request $request, ?int $ignoreId = null): array
    {
        $uniqueRule = Rule::unique('goi_dinh_ky', 'Ten_goi');
        if ($ignoreId !== null) {
            $uniqueRule = $uniqueRule->ignore($ignoreId, 'Ma_goi');
        }

        return $request->validate([
            'Ten_goi'              => ['required', 'string', 'min:3', 'max:150', $uniqueRule],
            'Mo_ta'                => ['nullable', 'string', 'max:1500'],
            'Gia_goi'              => ['required', 'numeric', 'min:1000', 'max:50000000'],
            'Ky_han_thang'         => ['required', 'integer', 'min:1', 'max:24'],
            'Khoi_luong_moi_lan'   => ['required', 'numeric', 'min:0.1', 'max:200'],
            'Trang_thai'           => ['nullable', 'string', Rule::in(['Dang_mo', 'Tam_dung'])],
            'items'                => ['required', 'array', 'min:1'],
            'items.*.Ma_san_pham'  => ['required', 'integer', 'distinct', 'exists:san_pham,Ma_san_pham'],
            'items.*.So_luong'     => ['required', 'numeric', 'min:0.1', 'max:100'],
        ], [
            'Ten_goi.required'              => 'Vui lòng nhập tên gói rau định kỳ.',
            'Ten_goi.unique'                => 'Tên gói rau định kỳ này đã tồn tại.',
            'Gia_goi.required'              => 'Vui lòng nhập giá gói định kỳ.',
            'Gia_goi.min'                   => 'Giá gói phải từ 1.000đ trở lên.',
            'Ky_han_thang.required'         => 'Vui lòng nhập kỳ hạn (tháng).',
            'Khoi_luong_moi_lan.required'   => 'Vui lòng nhập khối lượng mỗi lần giao.',
            'items.required'                => 'Vui lòng chọn ít nhất 1 nông sản cho gói định kỳ.',
            'items.min'                     => 'Vui lòng chọn ít nhất 1 nông sản cho gói định kỳ.',
            'items.*.Ma_san_pham.distinct'  => 'Không được chọn trùng cùng một sản phẩm trong một gói.',
            'items.*.So_luong.min'          => 'Số lượng mỗi nông sản phải lớn hơn 0.',
        ]);
    }

    private function formatPackage(GoiDinhKy $pkg): array
    {
        $items = $pkg->chiTiets->map(fn(ChiTietGoi $ct) => [
            'id'           => (int) $ct->Ma_ct_goi,
            'product_id'   => (int) $ct->Ma_san_pham,
            'product_name' => $ct->sanPham?->Ten_san_pham ?? 'Sản phẩm không còn tồn tại',
            'unit'         => $ct->sanPham?->Don_vi_tinh ?? 'kg',
            'unit_price'   => (float) ($ct->sanPham?->Gia_niem_yet ?? 0),
            'image'        => $ct->sanPham?->Hinh_anh_dai_dien,
            'quantity'     => (float) $ct->So_luong,
        ])->values()->all();

        return [
            'id'                  => (int) $pkg->Ma_goi,
            'name'                => $pkg->Ten_goi,
            'description'         => $pkg->Mo_ta,
            'price'               => (float) $pkg->Gia_goi,
            'duration_months'     => (int) $pkg->Ky_han_thang,
            'weight_per_delivery' => (float) $pkg->Khoi_luong_moi_lan,
            'status'              => $pkg->Trang_thai,
            'status_label'        => $pkg->Trang_thai === 'Dang_mo' ? 'Đang mở bán' : 'Tạm dừng',
            'registrations_count' => (int) ($pkg->registrations_count ?? 0),
            'items'               => $items,
        ];
    }

    private function clearPublicSubscriptionCache(): void
    {
        Cache::forget('public_subscription_packages_v1');
        Cache::forget('public_subscription_packages_v2');
    }
}
