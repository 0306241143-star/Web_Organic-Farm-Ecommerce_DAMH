<?php

/*
 * Luồng nhân viên nông trại: quản lý các lô canh tác.
 */

namespace App\Http\Controllers\Api\FarmStaff;

use App\Http\Controllers\Controller;
use App\Models\LoCanhTac;
use App\Models\MuaVu;
use App\Models\SanPham;
use App\Services\CultivationPlotService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CultivationPlotController extends Controller
{
    use ApiResponse;

    /**
     * Thêm lô canh tác vào mùa vụ.
     */
    public function store(Request $request, int $seasonId): JsonResponse
    {
        $season = MuaVu::find($seasonId);
        if (! $season) {
            return response()->json([
                'success'    => false,
                'message'    => 'Không tìm thấy mùa vụ để thêm lô canh tác.',
                'error_code' => self::ERR_NOT_FOUND,
                'data'       => null,
                'meta'       => null,
                'errors'     => null,
            ], 404);
        }

        $validated = $request->validate([
            'product_id'    => ['required', 'exists:san_pham,Ma_san_pham'],
            'plot_name'     => ['required', 'string', 'max:150'],
            'area_m2'       => ['nullable', 'numeric', 'min:1'],
            'planting_date' => ['required', 'date'],
            'status'        => ['nullable', 'in:Dang_canh_tac,Da_thu_hoach'],
        ], [
            'product_id.required'    => 'Vui lòng chọn loại nông sản giống trồng.',
            'product_id.exists'      => 'Nông sản đã chọn không tồn tại.',
            'plot_name.required'     => 'Vui lòng nhập tên lô canh tác (ví dụ: Lô A05).',
            'planting_date.required' => 'Vui lòng chọn ngày gieo trồng.',
        ]);

        $plot = LoCanhTac::create([
            'Ma_mua_vu'       => $season->Ma_mua_vu,
            'Ma_san_pham'     => $validated['product_id'],
            'Ten_lo'          => $validated['plot_name'],
            'Dien_tich'       => $validated['area_m2'] ?? null,
            'Ngay_gieo_trong' => $validated['planting_date'],
            'Trang_thai'      => $validated['status'] ?? 'Dang_canh_tac',
        ]);

        Cache::forget('farm_seasons_all');
        $plot->load('sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh,Hinh_anh_dai_dien');

        return $this->successResponse(
            message: 'Thêm lô canh tác vào mùa vụ thành công.',
            data: [
                'id'            => $plot->Ma_lo_canh_tac,
                'season_id'     => $plot->Ma_mua_vu,
                'product_id'    => $plot->Ma_san_pham,
                'product_name'  => $plot->sanPham?->Ten_san_pham,
                'product_unit'  => $plot->sanPham?->Don_vi_tinh,
                'plot_name'     => $plot->Ten_lo,
                'area_m2'       => (float) $plot->Dien_tich,
                'planting_date' => $plot->Ngay_gieo_trong,
                'status'        => $plot->Trang_thai,
            ],
            status: 201
        );
    }

    /**
     * Cập nhật thông tin lô canh tác (điều chỉnh diện tích, tên lô, giống nông sản, ngày gieo, trạng thái).
     */
    public function update(Request $request, int $seasonId, int $plotId): JsonResponse
    {
        $plot = LoCanhTac::where('Ma_mua_vu', $seasonId)
            ->where('Ma_lo_canh_tac', $plotId)
            ->first();

        if (! $plot) {
            return response()->json([
                'success'    => false,
                'message'    => 'Không tìm thấy lô canh tác để điều chỉnh.',
                'error_code' => self::ERR_NOT_FOUND,
                'data'       => null,
                'meta'       => null,
                'errors'     => null,
            ], 404);
        }

        $validated = $request->validate([
            'area_m2'       => ['sometimes', 'required', 'numeric', 'min:0.1'],
            'plot_name'     => ['sometimes', 'required', 'string', 'max:150'],
            'product_id'    => ['sometimes', 'required', 'exists:san_pham,Ma_san_pham'],
            'planting_date' => ['sometimes', 'required', 'date'],
            'status'        => ['sometimes', 'required', 'in:Dang_canh_tac,Da_thu_hoach'],
        ], [
            'area_m2.required'   => 'Vui lòng nhập diện tích canh tác.',
            'area_m2.numeric'    => 'Diện tích phải là số hợp lệ.',
            'area_m2.min'        => 'Diện tích tối thiểu phải từ 0.1 m² trở lên.',
            'plot_name.required' => 'Vui lòng nhập tên lô canh tác.',
        ]);

        if (array_key_exists('area_m2', $validated)) {
            $plot->Dien_tich = $validated['area_m2'];
        }
        if (isset($validated['plot_name'])) {
            $plot->Ten_lo = $validated['plot_name'];
        }
        if (isset($validated['product_id'])) {
            $plot->Ma_san_pham = $validated['product_id'];
        }
        if (isset($validated['planting_date'])) {
            $plot->Ngay_gieo_trong = $validated['planting_date'];
        }
        if (isset($validated['status'])) {
            $plot->Trang_thai = $validated['status'];
        }

        $plot->save();
        Cache::forget('farm_seasons_all');
        $plot->load('sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh,Hinh_anh_dai_dien');

        return $this->successResponse(
            message: 'Điều chỉnh thông tin diện tích và lô canh tác thành công.',
            data: [
                'id'            => $plot->Ma_lo_canh_tac,
                'season_id'     => $plot->Ma_mua_vu,
                'product_id'    => $plot->Ma_san_pham,
                'product_name'  => $plot->sanPham?->Ten_san_pham,
                'product_unit'  => $plot->sanPham?->Don_vi_tinh,
                'plot_name'     => $plot->Ten_lo,
                'area_m2'       => (float) $plot->Dien_tich,
                'planting_date' => $plot->Ngay_gieo_trong,
                'status'        => $plot->Trang_thai,
            ]
        );
    }

    /**
     * Xóa lô canh tác trong mùa vụ.
     */
    public function destroy(
        int $seasonId,
        int $plotId,
        CultivationPlotService $plots
    ): JsonResponse {
        $plot = LoCanhTac::with(['nhatKyCanhTacs.tepNhatKys', 'loHangs'])
            ->where('Ma_mua_vu', $seasonId)
            ->where('Ma_lo_canh_tac', $plotId)
            ->first();

        if (! $plot) {
            return response()->json([
                'success'    => false,
                'message'    => 'Không tìm thấy lô canh tác để xóa.',
                'error_code' => self::ERR_NOT_FOUND,
                'data'       => null,
                'meta'       => null,
                'errors'     => null,
            ], 404);
        }

        $linkedReason = $plots->findLinkedBatchReason($plot->loHangs);
        if ($linkedReason) {
            return response()->json([
                'success'    => false,
                'message'    => "Không thể xóa lô canh tác này vì {$linkedReason}.",
                'error_code' => self::ERR_CONFLICT,
                'data'       => null,
                'meta'       => null,
                'errors'     => null,
            ], 409);
        }

        $plots->deletePlotCascade($plot);
        Cache::forget('farm_seasons_all');

        return $this->successResponse(message: 'Xóa lô canh tác thành công.');
    }

    /**
     * Danh sách sản phẩm nông sản có sẵn để chọn giống gieo trồng.
     */
    public function getProducts(): JsonResponse
    {
        $products = Cache::remember('farm_active_products', 300, function () {
            return SanPham::select('Ma_san_pham', 'Ten_san_pham', 'Don_vi_tinh', 'Hinh_anh_dai_dien', 'Gia_ban')
                ->where('Trang_thai', 'Dang_ban')
                ->orderBy('Ten_san_pham', 'asc')
                ->get()
                ->map(function ($product) {
                    return [
                        'id'    => $product->Ma_san_pham,
                        'name'  => $product->Ten_san_pham,
                        'unit'  => $product->Don_vi_tinh,
                        'price' => (float) $product->Gia_ban,
                        'image' => $product->Hinh_anh_dai_dien,
                    ];
                });
        });

        return $this->successResponse(
            message: 'Lấy danh sách nông sản thành công.',
            data: $products
        );
    }
}
