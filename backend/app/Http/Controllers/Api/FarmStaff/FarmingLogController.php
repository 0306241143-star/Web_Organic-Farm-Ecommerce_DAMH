<?php

/*
 * Luồng nhân viên nông trại: ghi nhật ký canh tác và lưu media lên R2 (kèm fallback local).
 */

namespace App\Http\Controllers\Api\FarmStaff;

use App\Http\Controllers\Controller;
use App\Http\Requests\FarmStaff\StoreFarmingLogRequest;
use App\Models\LoCanhTac;
use App\Models\NhatKyCanhTac;
use App\Models\TepNhatKy;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FarmingLogController extends Controller
{
    use ApiResponse;

    /**
     * Danh sách nhật ký canh tác (hỗ trợ lọc theo lô, mùa vụ, loại hoạt động).
     */
    public function index(Request $request): JsonResponse
    {
        $plotId = $request->query('plot_id');
        $hasOtherFilters = $request->filled('activity_type') || $request->filled('season_id');

        if ($plotId && ! $hasOtherFilters) {
            $logs = Cache::remember("farm_logs_plot_{$plotId}", 60, function () use ($request) {
                return $this->fetchLogsCollection($request);
            });
        } else {
            $logs = $this->fetchLogsCollection($request);
        }

        return $this->successResponse(
            message: 'Lấy danh sách nhật ký canh tác thành công.',
            data: $logs
        );
    }

    /**
     * Helper truy vấn và chuẩn hóa danh sách nhật ký canh tác.
     */
    private function fetchLogsCollection(Request $request)
    {
        $query = NhatKyCanhTac::with([
            'nhanVien:Ma_nguoi_dung,Ho_ten',
            'tepNhatKys',
            'loCanhTac.sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh,Hinh_anh_dai_dien',
            'loCanhTac.muaVu:Ma_mua_vu,Ten_mua_vu',
            'loCanhTac.loHangs:Ma_lo_hang,Ma_lo_canh_tac,Trang_thai,Ngay_thu_hoach',
        ])->latest('Thoi_gian_thuc_hien');

        if ($request->filled('plot_id')) {
            $query->where('Ma_lo_canh_tac', $request->query('plot_id'));
        }

        if ($request->filled('activity_type')) {
            $query->where('Loai_hoat_dong', $request->query('activity_type'));
        }

        if ($request->filled('season_id')) {
            $seasonId = $request->query('season_id');
            $query->whereHas('loCanhTac', function ($q) use ($seasonId) {
                $q->where('Ma_mua_vu', $seasonId);
            });
        }

        return $query->get()->map(function ($log) {
            $existingBatch = $log->loCanhTac?->loHangs?->first();

            return [
                'id'            => $log->Ma_nhat_ky,
                'plot_id'       => $log->Ma_lo_canh_tac,
                'plot_name'     => $log->loCanhTac?->Ten_lo,
                'product_id'    => $log->loCanhTac?->Ma_san_pham,
                'product_name'  => $log->loCanhTac?->sanPham?->Ten_san_pham,
                'product_unit'  => $log->loCanhTac?->sanPham?->Don_vi_tinh ?? 'kg',
                'season_name'   => $log->loCanhTac?->muaVu?->Ten_mua_vu,
                'has_batch'     => ! is_null($existingBatch),
                'batch_id'      => $existingBatch?->Ma_lo_hang,
                'staff_id'      => $log->Ma_nhan_vien,
                'staff_name'    => $log->nhanVien?->Ho_ten ?? 'Kỹ thuật viên nông trại',
                'activity_type' => $log->Loai_hoat_dong,
                'activity_label'=> $this->getActivityLabel($log->Loai_hoat_dong),
                'action_time'   => $log->Thoi_gian_thuc_hien?->format('Y-m-d H:i:s'),
                'content'       => $log->Noi_dung,
                'media'         => $log->tepNhatKys->map(function ($file) {
                    return [
                        'id'   => $file->Ma_tep,
                        'type' => $file->Loai_tep,
                        'url'  => $file->Duong_dan,
                        'note' => $file->Mo_ta,
                    ];
                }),
                'created_at'    => $log->created_at?->toISOString(),
            ];
        });
    }

    /**
     * Ghi nhật ký canh tác mới và tải lên ảnh/video minh chứng.
     */
    public function store(StoreFarmingLogRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $staffId = Auth::id() ?? 3; // Mặc định Kỹ thuật Nông trại nếu chạy test

        $log = NhatKyCanhTac::create([
            'Ma_lo_canh_tac'      => $validated['Ma_lo_canh_tac'],
            'Ma_nhan_vien'        => $staffId,
            'Loai_hoat_dong'      => $validated['Loai_hoat_dong'],
            'Thoi_gian_thuc_hien' => $validated['Thoi_gian_thuc_hien'],
            'Noi_dung'            => $validated['Noi_dung'],
        ]);

        // Nếu ghi nhận hoạt động Thu hoạch, tự động cập nhật trạng thái Lô canh tác sang 'Da_thu_hoach'
        if ($validated['Loai_hoat_dong'] === 'Thu_hoach') {
            $plot = LoCanhTac::find($validated['Ma_lo_canh_tac']);
            if ($plot && $plot->Trang_thai !== 'Da_thu_hoach') {
                $plot->update(['Trang_thai' => 'Da_thu_hoach']);
            }
        }

        // Xử lý tệp đính kèm (ảnh / video)
        if ($request->hasFile('media')) {
            foreach ($request->file('media') as $file) {
                if (! $file->isValid()) {
                    continue;
                }

                $mime = $file->getMimeType();
                $isImage = str_starts_with($mime, 'image/');
                $fileType = $isImage ? 'Hinh_anh' : 'Video';
                $extension = $file->getClientOriginalExtension() ?: ($isImage ? 'jpg' : 'mp4');
                $filename = 'farm_log_' . $log->Ma_nhat_ky . '_' . Str::random(10) . '.' . $extension;

                $fileUrl = $this->uploadMediaFile($file, $filename);

                TepNhatKy::create([
                    'Ma_nhat_ky' => $log->Ma_nhat_ky,
                    'Loai_tep'   => $fileType,
                    'Duong_dan'  => $fileUrl,
                    'Mo_ta'      => $file->getClientOriginalName(),
                ]);
            }
        }

        $log->load([
            'nhanVien:Ma_nguoi_dung,Ho_ten',
            'tepNhatKys',
            'loCanhTac.sanPham',
        ]);

        Cache::forget("farm_logs_plot_{$validated['Ma_lo_canh_tac']}");
        Cache::forget('farm_seasons_all');

        return $this->successResponse(
            message: 'Ghi nhật ký canh tác thành công.',
            data: [
                'id'            => $log->Ma_nhat_ky,
                'plot_id'       => $log->Ma_lo_canh_tac,
                'plot_name'     => $log->loCanhTac?->Ten_lo,
                'product_name'  => $log->loCanhTac?->sanPham?->Ten_san_pham,
                'activity_type' => $log->Loai_hoat_dong,
                'activity_label'=> $this->getActivityLabel($log->Loai_hoat_dong),
                'action_time'   => $log->Thoi_gian_thuc_hien?->format('Y-m-d H:i:s'),
                'content'       => $log->Noi_dung,
                'staff_name'    => $log->nhanVien?->Ho_ten,
                'media'         => $log->tepNhatKys->map(function ($f) {
                    return [
                        'id'   => $f->Ma_tep,
                        'type' => $f->Loai_tep,
                        'url'  => $f->Duong_dan,
                        'note' => $f->Mo_ta,
                    ];
                }),
            ],
            status: 201
        );
    }

    /**
     * Xóa 1 bản ghi nhật ký.
     */
    public function destroy(int $id): JsonResponse
    {
        $log = NhatKyCanhTac::find($id);

        if (! $log) {
            return response()->json([
                'success'    => false,
                'message'    => 'Không tìm thấy nhật ký canh tác.',
                'error_code' => self::ERR_NOT_FOUND,
                'data'       => null,
                'meta'       => null,
                'errors'     => null,
            ], 404);
        }

        $plotId = $log->Ma_lo_canh_tac;
        $log->delete();

        Cache::forget("farm_logs_plot_{$plotId}");
        Cache::forget('farm_seasons_all');

        return $this->successResponse(message: 'Xóa nhật ký canh tác thành công.');
    }

    /**
     * Tải tệp lên Cloudflare R2 (kèm fallback sang disk 'public' nếu R2 không phản hồi).
     */
    private function uploadMediaFile($file, string $filename): string
    {
        $r2Configured = ! empty(env('R2_ACCESS_KEY_ID')) && ! empty(env('R2_BUCKET'));

        if ($r2Configured) {
            try {
                $path = Storage::disk('r2')->putFileAs('farming_logs', $file, $filename);
                if ($path) {
                    $baseUrl = rtrim(env('R2_URL', 'https://pub-48bd396b58a44984919181b1a0062072.r2.dev'), '/');

                    return "{$baseUrl}/{$path}";
                }
            } catch (\Throwable $e) {
                Log::warning('Lỗi tải tệp lên Cloudflare R2, chuyển sang lưu trữ cục bộ: ' . $e->getMessage());
            }
        }

        // Fallback lưu trữ cục bộ (disk 'public')
        $localPath = Storage::disk('public')->putFileAs('uploads/logs', $file, $filename);

        return '/storage/' . $localPath;
    }

    /**
     * Nhãn tiếng Việt cho loại hoạt động.
     */
    private function getActivityLabel(string $type): string
    {
        return match ($type) {
            'Gieo_hat'  => 'Gieo hạt & Ươm cây',
            'Bon_phan'  => 'Bón phân hữu cơ',
            'Tuoi_tieu' => 'Tưới tiêu nước sạch',
            'Thu_hoach' => 'Thu hoạch nông sản',
            default     => 'Hoạt động khác',
        };
    }
}
