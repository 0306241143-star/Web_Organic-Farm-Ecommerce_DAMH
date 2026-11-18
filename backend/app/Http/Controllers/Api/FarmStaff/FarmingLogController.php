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
use App\Services\R2StorageService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class FarmingLogController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected R2StorageService $r2Service
    ) {}

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

        return $query->get()->map(fn (NhatKyCanhTac $log) => $this->formatLogResource($log));
    }

    /**
     * Ghi nhận nhật ký canh tác mới (tận dụng R2StorageService, fallback local & bulk insert).
     */
    public function store(StoreFarmingLogRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $uploadedItems = [];

        // 1. Đẩy file lên R2 (hoặc fallback storage local) TRƯỚC khi mở DB::transaction
        if ($request->hasFile('media')) {
            foreach ($request->file('media') as $file) {
                if ($file instanceof UploadedFile && $file->isValid()) {
                    $uploadedItems[] = $this->uploadMediaWithFallback($file);
                }
            }
        }

        // 2. Ghi CSDL siêu nhanh trong 1 transaction ngắn gọn
        $log = DB::transaction(function () use ($validated, $uploadedItems) {
            $newLog = NhatKyCanhTac::create([
                'Ma_lo_canh_tac'      => $validated['Ma_lo_canh_tac'],
                'Ma_nhan_vien'        => Auth::id() ?? 1,
                'Loai_hoat_dong'      => $validated['Loai_hoat_dong'],
                'Thoi_gian_thuc_hien' => $validated['Thoi_gian_thuc_hien'],
                'Noi_dung'            => $validated['Noi_dung'],
            ]);

            if ($validated['Loai_hoat_dong'] === 'Thu_hoach') {
                LoCanhTac::where('Ma_lo_canh_tac', $validated['Ma_lo_canh_tac'])
                    ->where('Trang_thai', '!=', 'Da_thu_hoach')
                    ->update(['Trang_thai' => 'Da_thu_hoach']);
            }

            if (! empty($uploadedItems)) {
                $now = now();
                $mediaRows = array_map(fn (array $item) => [
                    'Ma_nhat_ky' => $newLog->Ma_nhat_ky,
                    'Loai_tep'   => $item['media_type'],
                    'Duong_dan'  => $item['url'],
                    'Mo_ta'      => $item['original_name'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ], $uploadedItems);

                TepNhatKy::insert($mediaRows);
            }

            return $newLog;
        });

        Cache::forget('farm_seasons_all');
        Cache::forget("farm_logs_plot_{$validated['Ma_lo_canh_tac']}");

        // 3. Load quan hệ và trả về đúng cấu trúc chuẩn để Frontend chèn thẳng vào State
        $log->load([
            'nhanVien:Ma_nguoi_dung,Ho_ten',
            'tepNhatKys',
            'loCanhTac.sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh,Hinh_anh_dai_dien',
            'loCanhTac.muaVu:Ma_mua_vu,Ten_mua_vu',
            'loCanhTac.loHangs:Ma_lo_hang,Ma_lo_canh_tac,Trang_thai,Ngay_thu_hoach',
        ]);

        return $this->successResponse(
            message: 'Ghi nhận nhật ký canh tác thành công.',
            data: $this->formatLogResource($log),
            status: 201
        );
    }

    /**
     * Xóa nhật ký canh tác kèm dọn tệp trên Cloudflare R2 hoặc bộ nhớ cục bộ.
     */
    public function destroy(int $id): JsonResponse
    {
        $log = NhatKyCanhTac::with('tepNhatKys')->findOrFail($id);
        $plotId = $log->Ma_lo_canh_tac;

        foreach ($log->tepNhatKys as $media) {
            $this->deleteMediaFile($media->Duong_dan);
        }

        $log->tepNhatKys()->delete();
        $log->delete();

        Cache::forget('farm_seasons_all');
        Cache::forget("farm_logs_plot_{$plotId}");

        return $this->successResponse(message: 'Đã xóa nhật ký canh tác thành công.');
    }

    /**
     * Tải tệp lên Cloudflare R2 qua R2StorageService; tự động fallback sang disk 'public' nếu chưa cấu hình R2.
     */
    private function uploadMediaWithFallback(UploadedFile $file): array
    {
        try {
            return $this->r2Service->upload($file, R2StorageService::FOLDER_FARMING_LOGS);
        } catch (Throwable $e) {
            Log::warning('R2 upload failed, falling back to local public storage.', [
                'file'  => $file->getClientOriginalName(),
                'error' => $e->getMessage(),
            ]);

            $mime = (string) $file->getClientMimeType();
            $mediaType = str_starts_with($mime, 'video/') ? 'Video' : 'Hinh_anh';
            $ext = strtolower($file->getClientOriginalExtension() ?: 'bin');
            $filename = 'log_' . now()->format('Ymd_His') . '_' . Str::random(8) . '.' . $ext;
            $localPath = Storage::disk('public')->putFileAs('uploads/farming-logs', $file, $filename);

            return [
                'url'           => '/storage/' . $localPath,
                'media_type'    => $mediaType,
                'original_name' => $file->getClientOriginalName(),
            ];
        }
    }

    /**
     * Xóa tệp media trên R2 hoặc local storage.
     */
    private function deleteMediaFile(?string $pathOrUrl): void
    {
        if (! $pathOrUrl) {
            return;
        }

        if (str_starts_with($pathOrUrl, '/storage/')) {
            $relative = ltrim(substr($pathOrUrl, strlen('/storage/')), '/');
            if (Storage::disk('public')->exists($relative)) {
                Storage::disk('public')->delete($relative);
            }
            return;
        }

        try {
            $this->r2Service->delete($pathOrUrl);
        } catch (Throwable $e) {
            Log::warning('Không thể xóa tệp media trên R2: ' . $e->getMessage());
        }
    }

    /**
     * Chuẩn hóa dữ liệu 1 bản ghi nhật ký canh tác trả về Frontend.
     */
    private function formatLogResource(NhatKyCanhTac $log): array
    {
        $existingBatch = $log->loCanhTac?->loHangs?->first();

        return [
            'id'             => $log->Ma_nhat_ky,
            'plot_id'        => $log->Ma_lo_canh_tac,
            'plot_name'      => $log->loCanhTac?->Ten_lo,
            'product_id'     => $log->loCanhTac?->Ma_san_pham,
            'product_name'   => $log->loCanhTac?->sanPham?->Ten_san_pham,
            'product_unit'   => $log->loCanhTac?->sanPham?->Don_vi_tinh ?? 'kg',
            'season_name'    => $log->loCanhTac?->muaVu?->Ten_mua_vu,
            'has_batch'      => ! is_null($existingBatch),
            'batch_id'       => $existingBatch?->Ma_lo_hang,
            'staff_id'       => $log->Ma_nhan_vien,
            'staff_name'     => $log->nhanVien?->Ho_ten ?? 'Kỹ thuật viên nông trại',
            'activity_type'  => $log->Loai_hoat_dong,
            'activity_label' => $this->getActivityLabel($log->Loai_hoat_dong),
            'action_time'    => $log->Thoi_gian_thuc_hien?->format('Y-m-d H:i:s'),
            'content'        => $log->Noi_dung,
            'media'          => $log->tepNhatKys->map(fn ($file) => [
                'id'   => $file->Ma_tep,
                'type' => $file->Loai_tep,
                'url'  => $file->Duong_dan,
                'note' => $file->Mo_ta,
            ])->values(),
            'created_at'     => $log->created_at?->toISOString(),
        ];
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