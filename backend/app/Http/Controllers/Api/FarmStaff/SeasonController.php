<?php

/*
 * Luồng nhân viên nông trại: quản lý thông tin mùa vụ và các lô canh tác.
 */

namespace App\Http\Controllers\Api\FarmStaff;

use App\Http\Controllers\Controller;
use App\Models\LoCanhTac;
use App\Models\MuaVu;
use App\Models\SanPham;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SeasonController extends Controller
{
    use ApiResponse;

    /**
     * Danh sách tất cả mùa vụ kèm theo danh sách các lô canh tác.
     */
    public function index(Request $request): JsonResponse
    {
        $query = MuaVu::with([
            'loCanhTacs.sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh,Hinh_anh_dai_dien',
            'loCanhTacs.nhatKyCanhTacs' => function ($q) {
                $q->latest('Thoi_gian_thuc_hien')->limit(1);
            },
        ])
            ->withCount('loCanhTacs')
            ->orderByRaw("CASE WHEN Trang_thai = 'Dang_dien_ra' THEN 0 ELSE 1 END")
            ->orderBy('Ngay_bat_dau', 'desc');

        if ($request->filled('status')) {
            $query->where('Trang_thai', $request->query('status'));
        }

        if ($request->filled('search')) {
            $keyword = trim($request->query('search'));
            $query->where('Ten_mua_vu', 'like', "%{$keyword}%");
        }

        $seasons = $query->get()->map(function ($season) {
            $totalArea = $season->loCanhTacs->sum('Dien_tich');
            $activePlotsCount = $season->loCanhTacs->where('Trang_thai', 'Dang_canh_tac')->count();
            $harvestedPlotsCount = $season->loCanhTacs->where('Trang_thai', 'Da_thu_hoach')->count();

            return [
                'id'                     => $season->Ma_mua_vu,
                'farm_id'                => $season->Ma_nong_trai,
                'name'                   => $season->Ten_mua_vu,
                'start_date'             => $season->Ngay_bat_dau,
                'end_date'               => $season->Ngay_ket_thuc,
                'status'                 => $season->Trang_thai,
                'total_plots'            => $season->lo_canh_tacs_count,
                'active_plots_count'     => $activePlotsCount,
                'harvested_plots_count'  => $harvestedPlotsCount,
                'total_area_m2'          => (float) $totalArea,
                'plots'                  => $season->loCanhTacs->map(function ($plot) {
                    $latestLog = $plot->nhatKyCanhTacs->first();

                    return [
                        'id'             => $plot->Ma_lo_canh_tac,
                        'season_id'      => $plot->Ma_mua_vu,
                        'product_id'     => $plot->Ma_san_pham,
                        'product_name'   => $plot->sanPham?->Ten_san_pham,
                        'product_unit'   => $plot->sanPham?->Don_vi_tinh,
                        'product_image'  => $plot->sanPham?->Hinh_anh_dai_dien,
                        'plot_name'      => $plot->Ten_lo,
                        'area_m2'        => (float) $plot->Dien_tich,
                        'planting_date'  => $plot->Ngay_gieo_trong,
                        'status'         => $plot->Trang_thai,
                        'latest_activity'=> $latestLog ? [
                            'type' => $latestLog->Loai_hoat_dong,
                            'date' => $latestLog->Thoi_gian_thuc_hien?->format('Y-m-d H:i'),
                            'note' => $latestLog->Noi_dung,
                        ] : null,
                    ];
                }),
                'created_at'             => $season->created_at?->toISOString(),
            ];
        });

        return $this->successResponse(
            message: 'Lấy danh sách mùa vụ thành công.',
            data: $seasons
        );
    }

    /**
     * Tạo mùa vụ mới.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:150'],
            'start_date'  => ['required', 'date'],
            'end_date'    => ['nullable', 'date', 'after_or_equal:start_date'],
            'status'      => ['nullable', 'in:Dang_dien_ra,Da_ket_thuc'],
            'farm_id'     => ['nullable', 'exists:nong_trai,Ma_nong_trai'],
        ], [
            'name.required'             => 'Vui lòng nhập tên mùa vụ.',
            'start_date.required'       => 'Vui lòng chọn ngày bắt đầu mùa vụ.',
            'end_date.after_or_equal'   => 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.',
        ]);

        $season = MuaVu::create([
            'Ma_nong_trai'   => $validated['farm_id'] ?? 1,
            'Ten_mua_vu'     => $validated['name'],
            'Ngay_bat_dau'   => $validated['start_date'],
            'Ngay_ket_thuc'  => $validated['end_date'] ?? null,
            'Trang_thai'     => $validated['status'] ?? 'Dang_dien_ra',
        ]);

        return $this->successResponse(
            message: 'Tạo mùa vụ mới thành công.',
            data: [
                'id'         => $season->Ma_mua_vu,
                'name'       => $season->Ten_mua_vu,
                'start_date' => $season->Ngay_bat_dau,
                'end_date'   => $season->Ngay_ket_thuc,
                'status'     => $season->Trang_thai,
            ],
            status: 201
        );
    }

    /**
     * Chi tiết 1 mùa vụ.
     */
    public function show(int $id): JsonResponse
    {
        $season = MuaVu::with([
            'loCanhTacs.sanPham',
            'loCanhTacs.nhatKyCanhTacs.tepNhatKys',
            'loCanhTacs.nhatKyCanhTacs.nhanVien:Ma_nguoi_dung,Ho_ten',
        ])->find($id);

        if (! $season) {
            return response()->json([
                'success'    => false,
                'message'    => 'Không tìm thấy thông tin mùa vụ.',
                'error_code' => self::ERR_NOT_FOUND,
                'data'       => null,
                'meta'       => null,
                'errors'     => null,
            ], 404);
        }

        return $this->successResponse(
            message: 'Lấy chi tiết mùa vụ thành công.',
            data: $season
        );
    }

    /**
     * Cập nhật mùa vụ.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $season = MuaVu::find($id);

        if (! $season) {
            return response()->json([
                'success'    => false,
                'message'    => 'Không tìm thấy mùa vụ để cập nhật.',
                'error_code' => self::ERR_NOT_FOUND,
                'data'       => null,
                'meta'       => null,
                'errors'     => null,
            ], 404);
        }

        $validated = $request->validate([
            'name'       => ['sometimes', 'required', 'string', 'max:150'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date'   => ['nullable', 'date'],
            'status'     => ['sometimes', 'required', 'in:Dang_dien_ra,Da_ket_thuc'],
        ]);

        if (isset($validated['name'])) {
            $season->Ten_mua_vu = $validated['name'];
        }
        if (isset($validated['start_date'])) {
            $season->Ngay_bat_dau = $validated['start_date'];
        }
        if (array_key_exists('end_date', $validated)) {
            $season->Ngay_ket_thuc = $validated['end_date'];
        }
        if (isset($validated['status'])) {
            $season->Trang_thai = $validated['status'];
        }

        $season->save();

        return $this->successResponse(
            message: 'Cập nhật mùa vụ thành công.',
            data: [
                'id'         => $season->Ma_mua_vu,
                'name'       => $season->Ten_mua_vu,
                'start_date' => $season->Ngay_bat_dau,
                'end_date'   => $season->Ngay_ket_thuc,
                'status'     => $season->Trang_thai,
            ]
        );
    }

    /**
     * Thêm lô canh tác vào mùa vụ.
     */
    public function storePlot(Request $request, int $seasonId): JsonResponse
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
    public function updatePlot(Request $request, int $seasonId, int $plotId): JsonResponse
    {
        $plot = LoCanhTac::where('Ma_mua_vu', $seasonId)->where('Ma_lo_canh_tac', $plotId)->first();

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
     * Xóa mùa vụ (kèm dọn dẹp các lô và nhật ký liên quan nếu chưa phát sinh đơn bán hàng).
     */
    public function destroy(int $id): JsonResponse
    {
        $season = MuaVu::with(['loCanhTacs.nhatKyCanhTacs.tepNhatKys', 'loCanhTacs.loHangs'])->find($id);

        if (! $season) {
            return response()->json([
                'success'    => false,
                'message'    => 'Không tìm thấy thông tin mùa vụ để xóa.',
                'error_code' => self::ERR_NOT_FOUND,
                'data'       => null,
                'meta'       => null,
                'errors'     => null,
            ], 404);
        }

        // Kiểm tra xem các lô hàng thuộc mùa vụ này đã có dữ liệu phân bổ, kho hoặc Flash Sale chưa
        $linkedReason = null;
        foreach ($season->loCanhTacs as $plot) {
            foreach ($plot->loHangs as $batch) {
                $batchId = $batch->Ma_lo_hang;
                if (\Illuminate\Support\Facades\DB::table('chi_tiet_don_hang')->where('Ma_lo_hang', $batchId)->exists()) {
                    $linkedReason = 'đã phát sinh chi tiết đơn bán cho khách hàng';
                    break 2;
                }
                if (\Illuminate\Support\Facades\DB::table('phan_bo_lo_hang')->where('Ma_lo_hang', $batchId)->exists()) {
                    $linkedReason = 'đã được hệ thống phân bổ kho (FEFO) cho các đơn hàng';
                    break 2;
                }
                if (\Illuminate\Support\Facades\DB::table('chi_tiet_flash_sale')->where('Ma_lo_hang', $batchId)->exists()) {
                    $linkedReason = 'đang được gán trong chương trình khuyến mãi Flash Sale';
                    break 2;
                }
                if (\Illuminate\Support\Facades\DB::table('bien_dong_kho')->where('Ma_lo_hang', $batchId)->exists()) {
                    $linkedReason = 'đã có phiếu biến động xuất nhập kho ghi nhận';
                    break 2;
                }
            }
        }

        if ($linkedReason) {
            return response()->json([
                'success'    => false,
                'message'    => "Không thể xóa mùa vụ này vì {$linkedReason}. Để bảo toàn lịch sử giao dịch và truy xuất nguồn gốc tem QR, bạn hãy chuyển trạng thái mùa vụ sang 'Đã kết thúc'.",
                'error_code' => self::ERR_CONFLICT,
                'data'       => null,
                'meta'       => null,
                'errors'     => null,
            ], 409);
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($season) {
            foreach ($season->loCanhTacs as $plot) {
                foreach ($plot->nhatKyCanhTacs as $log) {
                    $log->tepNhatKys()->delete();
                    $log->delete();
                }
                $plot->loHangs()->delete();
                $plot->delete();
            }
            $season->delete();
        });

        return $this->successResponse(message: 'Xóa mùa vụ thành công.');
    }

    /**
     * Xóa lô canh tác trong mùa vụ.
     */
    public function destroyPlot(int $seasonId, int $plotId): JsonResponse
    {
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

        \Illuminate\Support\Facades\DB::transaction(function () use ($plot) {
            foreach ($plot->nhatKyCanhTacs as $log) {
                $log->tepNhatKys()->delete();
                $log->delete();
            }
            $plot->loHangs()->delete();
            $plot->delete();
        });

        return $this->successResponse(message: 'Xóa lô canh tác thành công.');
    }

    /**
     * Danh sách sản phẩm nông sản có sẵn để chọn giống gieo trồng.
     */
    public function getProducts(): JsonResponse
    {
        $products = SanPham::select('Ma_san_pham', 'Ten_san_pham', 'Don_vi_tinh', 'Hinh_anh_dai_dien', 'Gia_ban')
            ->where('Trang_thai', 'Dang_ban')
            ->orderBy('Ten_san_pham', 'asc')
            ->get()
            ->map(function ($p) {
                return [
                    'id'    => $p->Ma_san_pham,
                    'name'  => $p->Ten_san_pham,
                    'unit'  => $p->Don_vi_tinh,
                    'price' => (float) $p->Gia_ban,
                    'image' => $p->Hinh_anh_dai_dien,
                ];
            });

        return $this->successResponse(
            message: 'Lấy danh sách nông sản thành công.',
            data: $products
        );
    }
}
