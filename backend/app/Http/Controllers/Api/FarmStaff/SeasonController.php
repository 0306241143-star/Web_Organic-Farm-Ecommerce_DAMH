<?php

/*
 * Luồng nhân viên nông trại: quản lý thông tin mùa vụ và các lô canh tác.
 */

namespace App\Http\Controllers\Api\FarmStaff;

use App\Http\Controllers\Controller;
use App\Models\MuaVu;
use App\Services\CultivationPlotService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SeasonController extends Controller
{
    use ApiResponse;

    /**
     * Danh sách tất cả mùa vụ kèm theo danh sách các lô canh tác.
     */
    public function index(Request $request): JsonResponse
    {
        $hasFilters = $request->filled('status') || $request->filled('search');

        if (! $hasFilters) {
            $seasons = Cache::remember('farm_seasons_all', 60, function () use ($request) {
                return $this->fetchSeasonsCollection($request);
            });
        } else {
            $seasons = $this->fetchSeasonsCollection($request);
        }

        return $this->successResponse(
            message: 'Lấy danh sách mùa vụ thành công.',
            data: $seasons
        );
    }

    /**
     * Helper truy vấn và chuẩn hóa danh sách mùa vụ & các lô canh tác.
     */
    private function fetchSeasonsCollection(Request $request)
    {
        $query = MuaVu::with([
            'loCanhTacs.sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh,Hinh_anh_dai_dien',
            'loCanhTacs.latestNhatKyCanhTac',
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

        return $query->get()->map(function ($season) {
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
                    $latestLog = $plot->latestNhatKyCanhTac;

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

        Cache::forget('farm_seasons_all');

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
        Cache::forget('farm_seasons_all');

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
    /**
     * Xóa mùa vụ (kèm dọn dẹp các lô và nhật ký liên quan nếu chưa phát sinh đơn bán hàng).
     */
    public function destroy(int $id, CultivationPlotService $plots): JsonResponse
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

        // Kiểm tra xem các lô hàng thuộc mùa vụ này đã phát sinh đơn hàng, Flash Sale hoặc biến động kho chưa
        $allBatches = $season->loCanhTacs->flatMap(fn ($plot) => $plot->loHangs);
        $linkedReason = $plots->findLinkedBatchReason($allBatches);

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

        DB::transaction(function () use ($season, $plots) {
            foreach ($season->loCanhTacs as $plot) {
                $plots->deletePlotCascade($plot);
            }
            $season->delete();
        });

        Cache::forget('farm_seasons_all');

        return $this->successResponse(message: 'Xóa mùa vụ thành công.');
    }

}
