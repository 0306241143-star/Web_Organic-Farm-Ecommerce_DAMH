<?php

/*
 * Luồng Quản trị viên (Admin): Cấu hình thông tin cơ sở nông trại & bộ sưu tập hình ảnh thực tế.
 */

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HinhAnhNongTrai;
use App\Models\NongTrai;
use App\Services\R2StorageService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use App\Services\GoongGeocodingService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class FarmProfileController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected R2StorageService $r2Service,
        protected GoongGeocodingService $geocoder
    ) {}
    /**
     * GET /api/admin/settings/farm
     * Lấy thông tin nông trại và danh sách hình ảnh thực tế.
     */
    public function show(): JsonResponse
    {
        $farm = $this->getOrCreateDefaultFarm();
        $farm->load('hinhAnhs');

        return $this->successResponse(
            message: 'Lấy thông tin cấu hình nông trại thành công.',
            data: $this->formatFarm($farm)
        );
    }

    /**
     * PUT /api/admin/settings/farm
     * Cập nhật thông tin nông trại, thứ tự/chú thích ảnh hiện có và thêm ảnh mới (multipart/form-data).
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'Ten_nong_trai'          => ['required', 'string', 'min:2', 'max:200'],
            'Dia_chi'                => ['required', 'string', 'min:5', 'max:255'],
            'Vi_do'                  => ['required', 'numeric', 'between:-90,90'],
            'Kinh_do'                => ['required', 'numeric', 'between:-180,180'],
            'Cau_chuyen_thuong_hieu' => ['nullable', 'string', 'max:10000'],
            'Triet_ly_canh_tac'      => ['nullable', 'string', 'max:10000'],
            'Ho_so_nang_luc'         => ['nullable', 'string', 'max:10000'],
            'existing_images'        => ['nullable', 'array'],
            'existing_images.*.id'   => ['required', 'integer'],
            'existing_images.*.caption' => ['nullable', 'string', 'max:255'],
            'images'                 => ['nullable', 'array', 'max:15'],
            'images.*'               => ['file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'image_captions'         => ['nullable', 'array'],
            'image_captions.*'       => ['nullable', 'string', 'max:255'],
            'image_urls'             => ['nullable', 'array'],
            'image_urls.*'           => ['nullable', 'string', 'max:500'],
        ], [
            'Ten_nong_trai.required' => 'Vui lòng nhập tên cơ sở nông trại.',
            'Dia_chi.required'       => 'Vui lòng nhập địa chỉ nông trại.',
            'Vi_do.required'         => 'Vui lòng nhập vĩ độ GPS.',
            'Kinh_do.required'       => 'Vui lòng nhập kinh độ GPS.',
            'images.*.mimes'         => 'Chỉ hỗ trợ ảnh định dạng JPG, PNG hoặc WebP.',
            'images.*.max'           => 'Dung lượng mỗi ảnh tối đa 10MB.',
        ]);

        $farm = $this->getOrCreateDefaultFarm();
        $newAddress = trim($validated['Dia_chi']);
        $latitude = round((float) $validated['Vi_do'], 7);
        $longitude = round((float) $validated['Kinh_do'], 7);
        $deletedPaths = [];


        // Nếu địa chỉ thay đổi và tọa độ vẫn giữ nguyên giá trị cũ -> tự động geocode tọa độ mới
        $addressChanged = mb_strtolower($newAddress) !== mb_strtolower(trim((string) $farm->Dia_chi));
        $coordsUnchanged = abs($latitude - (float) $farm->Vi_do) < 0.000001
            && abs($longitude - (float) $farm->Kinh_do) < 0.000001;

        if ($addressChanged && $coordsUnchanged) {
            try {
                $geocoded = $this->geocoder->geocode($newAddress);
                $latitude = round($geocoded['latitude'], 7);
                $longitude = round($geocoded['longitude'], 7);
            } catch (Throwable $e) {
                Log::warning('Auto geocode farm address failed; keeping submitted coordinates.', [
                    'address' => $newAddress,
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        DB::transaction(function () use ($request, $validated, $farm, &$deletedPaths): void {
            $farm->update([
                'Ten_nong_trai'          => trim($validated['Ten_nong_trai']),
                'Dia_chi'                => trim($validated['Dia_chi']),
                'Vi_do'                  => round((float) $validated['Vi_do'], 7),
                'Kinh_do'                => round((float) $validated['Kinh_do'], 7),
                'Cau_chuyen_thuong_hieu' => isset($validated['Cau_chuyen_thuong_hieu'])
                    ? trim((string) $validated['Cau_chuyen_thuong_hieu'])
                    : null,
                'Triet_ly_canh_tac'      => isset($validated['Triet_ly_canh_tac'])
                    ? trim((string) $validated['Triet_ly_canh_tac'])
                    : null,
                'Ho_so_nang_luc'         => isset($validated['Ho_so_nang_luc'])
                    ? trim((string) $validated['Ho_so_nang_luc'])
                    : null,
            ]);

            // 1. Đồng bộ danh sách ảnh cũ giữ lại & cập nhật thứ tự + mô tả
            $existingInput = $validated['existing_images'] ?? [];
            $keptIds = collect($existingInput)
                ->pluck('id')
                ->map(fn($id) => (int) $id)
                ->values()
                ->all();

            $toDelete = HinhAnhNongTrai::query()
                ->where('Ma_nong_trai', $farm->Ma_nong_trai)
                ->when(! empty($keptIds), fn($q) => $q->whereNotIn('Ma_hinh_anh', $keptIds))
                ->get();

            foreach ($toDelete as $imgRow) {
                $deletedPaths[] = $imgRow->Duong_dan;
                $imgRow->delete();
            }

            $order = 0;
            foreach ($existingInput as $item) {
                $imgId = (int) $item['id'];
                HinhAnhNongTrai::query()
                    ->where('Ma_nong_trai', $farm->Ma_nong_trai)
                    ->where('Ma_hinh_anh', $imgId)
                    ->update([
                        'Mo_ta'  => isset($item['caption']) ? trim((string) $item['caption']) : null,
                        'Thu_tu' => $order++,
                    ]);
            }

            // 2. Lưu các tệp ảnh mới tải lên
            $captions = $validated['image_captions'] ?? [];
            if ($request->hasFile('images')) {
                foreach ($request->file('images') as $idx => $file) {
                    if ($file instanceof UploadedFile && $file->isValid()) {
                        $storedPath = $this->storeFarmImage($file);
                        $caption = isset($captions[$idx]) ? trim((string) $captions[$idx]) : null;
                        HinhAnhNongTrai::query()->create([
                            'Ma_nong_trai' => $farm->Ma_nong_trai,
                            'Duong_dan'    => $storedPath,
                            'Mo_ta'        => $caption !== '' ? $caption : null,
                            'Thu_tu'       => $order++,
                        ]);
                    }
                }
            }

            // 3. Hỗ trợ thêm nhanh bằng URL ảnh bên ngoài (nếu có)
            if (! empty($validated['image_urls']) && is_array($validated['image_urls'])) {
                foreach ($validated['image_urls'] as $rawUrl) {
                    $cleanUrl = trim((string) $rawUrl);
                    if ($cleanUrl !== '') {
                        HinhAnhNongTrai::query()->create([
                            'Ma_nong_trai' => $farm->Ma_nong_trai,
                            'Duong_dan'    => $cleanUrl,
                            'Mo_ta'        => null,
                            'Thu_tu'       => $order++,
                        ]);
                    }
                }
            }
        });

        foreach ($deletedPaths as $oldPath) {
            $this->deleteStoredImage($oldPath);
        }

        $this->clearFarmCaches();

        $farm->refresh()->load('hinhAnhs');

        return $this->successResponse(
            message: 'Đã lưu cấu hình thông tin và hình ảnh nông trại thành công.',
            data: $this->formatFarm($farm)
        );
    }

    /**
     * DELETE /api/admin/settings/farm/images/{imageId}
     * Xóa nhanh một ảnh trong bộ sưu tập nông trại.
     */
    public function destroyImage(int $imageId): JsonResponse
    {
        $farm = $this->getOrCreateDefaultFarm();
        $image = HinhAnhNongTrai::query()
            ->where('Ma_nong_trai', $farm->Ma_nong_trai)
            ->where('Ma_hinh_anh', $imageId)
            ->first();

        if (! $image) {
            return $this->errorResponse(
                message: 'Không tìm thấy hình ảnh nông trại yêu cầu.',
                status: 404,
                errorCode: self::ERR_NOT_FOUND
            );
        }

        $rawPath = $image->Duong_dan;
        $image->delete();
        $this->deleteStoredImage($rawPath);

        // Đánh lại số thứ tự liên tục
        HinhAnhNongTrai::query()
            ->where('Ma_nong_trai', $farm->Ma_nong_trai)
            ->orderBy('Thu_tu')
            ->orderBy('Ma_hinh_anh')
            ->get()
            ->values()
            ->each(function (HinhAnhNongTrai $row, int $idx): void {
                if ((int) $row->Thu_tu !== $idx) {
                    $row->update(['Thu_tu' => $idx]);
                }
            });

        $this->clearFarmCaches();

        return $this->successResponse(
            message: 'Đã xóa hình ảnh nông trại.',
            data: ['deleted_id' => $imageId]
        );
    }

    private function getOrCreateDefaultFarm(): NongTrai
    {
        $farm = NongTrai::query()->orderBy('Ma_nong_trai')->first();
        if ($farm) {
            return $farm;
        }

        return NongTrai::query()->create([
            'Ten_nong_trai'          => 'Nông Trại Sinh Thái XanhFarm Củ Chi',
            'Dia_chi'                => 'Ấp 3, Xã Nhuận Đức, Huyện Củ Chi, TP. Hồ Chí Minh',
            'Vi_do'                  => 10.9985000,
            'Kinh_do'                => 106.5123000,
            'Cau_chuyen_thuong_hieu' => 'XanhFarm khởi nguồn từ khát vọng mang rau củ hữu cơ chuẩn sạch, minh bạch nguồn gốc từ vườn đến bàn ăn mỗi gia đình Việt.',
            'Triet_ly_canh_tac'      => 'Canh tác thuận tự nhiên 100% không thuốc bảo vệ thực vật hóa học, sử dụng phân hữu cơ vi sinh và kiểm định đất - nước định kỳ.',
            'Ho_so_nang_luc'         => 'Quy mô 5 hecta nhà màng công nghệ cao kết hợp vùng trồng hữu cơ đạt chuẩn VietGAP & TCVN 11041, truy xuất QR từng lô thu hoạch.',
        ]);
    }

    private function formatFarm(NongTrai $farm): array
    {
        $images = $farm->hinhAnhs->map(function (HinhAnhNongTrai $img, int $idx): array {
            return [
                'id'         => (int) $img->Ma_hinh_anh,
                'path'       => $img->Duong_dan,
                'url'        => $this->toPublicUrl($img->Duong_dan),
                'caption'    => $img->Mo_ta ?? '',
                'sort_order' => (int) $img->Thu_tu,
                'is_cover'   => $idx === 0,
            ];
        })->values()->all();

        return [
            'id'                 => (int) $farm->Ma_nong_trai,
            'name'               => $farm->Ten_nong_trai,
            'address'            => $farm->Dia_chi,
            'latitude'           => (float) $farm->Vi_do,
            'longitude'          => (float) $farm->Kinh_do,
            'brand_story'        => $farm->Cau_chuyen_thuong_hieu ?? '',
            'farming_philosophy' => $farm->Triet_ly_canh_tac ?? '',
            'capacity_profile'   => $farm->Ho_so_nang_luc ?? '',
            'images'             => $images,
            'updated_at'         => $farm->updated_at?->toISOString(),
        ];
    }

    private function storeFarmImage(UploadedFile $file): string
    {
        try {
            $uploaded = $this->r2Service->upload($file, 'farm-gallery');
            return $uploaded['url'];
        } catch (Throwable $e) {
            Log::warning('R2 farm image upload failed, falling back to local public disk: ' . $e->getMessage());
            $ext = strtolower($file->getClientOriginalExtension() ?: 'webp');
            $filename = 'farm_' . now()->format('Ymd_His') . '_' . Str::random(8) . '.' . $ext;
            $localPath = Storage::disk('public')->putFileAs('uploads/farm', $file, $filename);
            return '/storage/' . $localPath;
        }
    }

    private function deleteStoredImage(?string $pathOrUrl): void
    {
        if (! $pathOrUrl) {
            return;
        }

        if (str_starts_with($pathOrUrl, '/storage/uploads/farm/')) {
            $relative = ltrim(substr($pathOrUrl, strlen('/storage/')), '/');
            if (Storage::disk('public')->exists($relative)) {
                Storage::disk('public')->delete($relative);
            }
            return;
        }

        try {
            $this->r2Service->delete($pathOrUrl);
        } catch (Throwable) {
            // Bỏ qua nếu là URL tĩnh bên ngoài
        }
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

    private function clearFarmCaches(): void
    {
        Cache::forget('farm_info_singleton');
        Cache::forget('public_brand_story_v1');
    }


    /**
     * POST /api/admin/settings/farm/geocode
     * Tra cứu nhanh tọa độ GPS từ địa chỉ văn bản qua Goong Maps.
     */
    public function geocodeAddress(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address' => ['required', 'string', 'min:5', 'max:255'],
        ], [
            'address.required' => 'Vui lòng nhập địa chỉ cần lấy tọa độ.',
        ]);

        try {
            $coords = $this->geocoder->geocode(trim($validated['address']));

            return $this->successResponse(
                message: 'Đã lấy tọa độ GPS từ địa chỉ thành công.',
                data: [
                    'latitude'  => round($coords['latitude'], 7),
                    'longitude' => round($coords['longitude'], 7),
                ]
            );
        } catch (Throwable $e) {
            return $this->errorResponse(
                message: 'Không thể tự động định vị địa chỉ này qua Goong Maps. Vui lòng kiểm tra lại địa chỉ hoặc nhập tọa độ thủ công.',
                status: 422,
                errorCode: self::ERR_VALIDATION
            );
        }
    }
}
