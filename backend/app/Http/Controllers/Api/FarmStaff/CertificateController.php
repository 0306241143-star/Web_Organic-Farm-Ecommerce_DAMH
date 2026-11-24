<?php

/*
 * Luồng nhân viên nông trại: tải chứng nhận chất lượng & bản scan kết quả kiểm định gắn vào lô hàng.
 */

namespace App\Http\Controllers\Api\FarmStaff;

use App\Http\Controllers\Controller;
use App\Http\Requests\FarmStaff\UploadCertificateRequest;
use App\Models\ChungNhan;
use App\Models\LoHang;
use App\Services\R2StorageService;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class CertificateController extends Controller
{
    use ApiResponse;

    public function __construct(private R2StorageService $storage)
    {
    }

    /**
     * Danh sách toàn bộ chứng nhận & kết quả kiểm định kèm thống kê hiệu lực.
     */
    public function index(Request $request): JsonResponse
    {
        $all = ChungNhan::with([
            'loHang.loCanhTac.sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh',
            'loHang.loCanhTac.muaVu:Ma_mua_vu,Ten_mua_vu',
            'loHang.maQrTruyXuat:Ma_qr,Ma_lo_hang,Chuoi_ma_qr',
            'sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh',
        ])
            ->latest('Ma_chung_nhan')
            ->get()
            ->map(fn (ChungNhan $cert) => $this->formatCertificateResource($cert));

        $stats = [
            'total'          => $all->count(),
            'valid'          => $all->whereIn('validity_status', ['valid', 'no_expiry'])->count(),
            'expiring_soon'  => $all->where('validity_status', 'expiring_soon')->count(),
            'expired'        => $all->where('validity_status', 'expired')->count(),
            'batch_attached' => $all->whereNotNull('batch_id')->count(),
        ];

        $filtered = $all;

        if ($request->filled('batch_id')) {
            $batchId = (int) $request->query('batch_id');
            $filtered = $filtered->where('batch_id', $batchId);
        }

        if ($request->filled('scope') && $request->query('scope') !== 'ALL') {
            $scope = $request->query('scope');
            if ($scope === 'batch') {
                $filtered = $filtered->whereNotNull('batch_id');
            } elseif ($scope === 'product') {
                $filtered = $filtered->whereNull('batch_id');
            }
        }

        if ($request->filled('status') && $request->query('status') !== 'ALL') {
            $status = $request->query('status');
            if ($status === 'valid') {
                $filtered = $filtered->whereIn('validity_status', ['valid', 'no_expiry']);
            } else {
                $filtered = $filtered->where('validity_status', $status);
            }
        }

        if ($request->filled('search')) {
            $keyword = mb_strtolower(trim((string) $request->query('search')));
            $filtered = $filtered->filter(function (array $item) use ($keyword) {
                $haystack = mb_strtolower(implode(' ', array_filter([
                    $item['name'],
                    $item['issuer'],
                    $item['batch_code'],
                    $item['product_name'],
                    $item['plot_name'],
                    $item['season_name'],
                ])));

                return str_contains($haystack, $keyword);
            });
        }

        return $this->successResponse(
            message: 'Lấy danh sách chứng nhận và kết quả kiểm định thành công.',
            data: [
                'certificates' => $filtered->values(),
                'stats'        => $stats,
            ]
        );
    }

    /**
     * Tải lên chứng nhận chất lượng / bản scan kết quả kiểm định mới (gắn vào lô hàng hoặc sản phẩm).
     */
    public function store(UploadCertificateRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $batchId = isset($validated['Ma_lo_hang']) ? (int) $validated['Ma_lo_hang'] : null;
        $productId = isset($validated['Ma_san_pham']) ? (int) $validated['Ma_san_pham'] : null;

        // Nếu gắn vào lô hàng mà chưa chọn sản phẩm riêng, tự động đồng bộ mã sản phẩm từ lô canh tác
        if ($batchId !== null && $productId === null) {
            $batch = LoHang::with('loCanhTac')->find($batchId);
            $productId = $batch?->loCanhTac?->Ma_san_pham;
        }

        /** @var UploadedFile $file */
        $file = $request->file('file');
        $filePath = $this->uploadCertificateFile($file);

        $cert = ChungNhan::create([
            'Ma_lo_hang'     => $batchId,
            'Ma_san_pham'    => $productId,
            'Ten_chung_nhan' => trim($validated['Ten_chung_nhan']),
            'To_chuc_cap'    => trim($validated['To_chuc_cap']),
            'Ngay_cap'       => $validated['Ngay_cap'],
            'Ngay_het_han'   => $validated['Ngay_het_han'] ?? null,
            'Duong_dan_tep'  => $filePath,
        ]);

        $cert->load([
            'loHang.loCanhTac.sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh',
            'loHang.loCanhTac.muaVu:Ma_mua_vu,Ten_mua_vu',
            'loHang.maQrTruyXuat:Ma_qr,Ma_lo_hang,Chuoi_ma_qr',
            'sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh',
        ]);

        return $this->successResponse(
            message: 'Tải lên chứng nhận và gắn hồ sơ thành công.',
            data: $this->formatCertificateResource($cert),
            status: 201
        );
    }

    /**
     * Cập nhật thông tin chứng nhận, gắn lại lô hàng hoặc thay thế tệp bản scan.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $cert = ChungNhan::find($id);
        if (! $cert) {
            return response()->json([
                'success'    => false,
                'message'    => 'Không tìm thấy hồ sơ chứng nhận.',
                'error_code' => self::ERR_NOT_FOUND,
                'data'       => null,
                'meta'       => null,
                'errors'     => null,
            ], 404);
        }

        $today = Carbon::now('Asia/Ho_Chi_Minh')->toDateString();

        $validated = $request->validate([
            'Ma_lo_hang'     => ['nullable', 'integer', 'exists:lo_hang,Ma_lo_hang'],
            'Ma_san_pham'    => ['nullable', 'integer', 'exists:san_pham,Ma_san_pham'],
            'Ten_chung_nhan' => ['required', 'string', 'min:3', 'max:150'],
            'To_chuc_cap'    => ['required', 'string', 'min:2', 'max:150'],
            'Ngay_cap'       => ['required', 'date', 'before_or_equal:' . $today],
            'Ngay_het_han'   => ['nullable', 'date', 'after_or_equal:Ngay_cap'],
            'file'           => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
        ], [
            'Ma_lo_hang.exists'           => 'Lô hàng thu hoạch đã chọn không tồn tại.',
            'Ma_san_pham.exists'          => 'Sản phẩm đã chọn không tồn tại.',
            'Ten_chung_nhan.required'     => 'Vui lòng nhập tên chứng nhận hoặc phiếu kiểm định.',
            'To_chuc_cap.required'        => 'Vui lòng nhập tổ chức cấp hoặc đơn vị kiểm định.',
            'Ngay_cap.required'           => 'Vui lòng chọn ngày cấp.',
            'Ngay_cap.before_or_equal'    => 'Ngày cấp không được lớn hơn ngày hôm nay.',
            'Ngay_het_han.after_or_equal' => 'Ngày hết hạn phải sau hoặc bằng ngày cấp.',
            'file.mimes'                  => 'Chỉ chấp nhận tệp định dạng PDF, JPG, JPEG, PNG hoặc WEBP.',
            'file.max'                    => 'Dung lượng tệp tối đa là 10MB.',
        ]);

        $batchId = array_key_exists('Ma_lo_hang', $validated) && $validated['Ma_lo_hang'] !== null
            ? (int) $validated['Ma_lo_hang']
            : null;
        $productId = array_key_exists('Ma_san_pham', $validated) && $validated['Ma_san_pham'] !== null
            ? (int) $validated['Ma_san_pham']
            : null;

        if ($batchId === null && $productId === null) {
            return response()->json([
                'success'    => false,
                'message'    => 'Vui lòng chọn Lô hàng thu hoạch hoặc Sản phẩm để gắn chứng nhận.',
                'error_code' => self::ERR_VALIDATION,
                'data'       => null,
                'meta'       => null,
                'errors'     => [
                    'Ma_lo_hang' => ['Vui lòng chọn Lô hàng thu hoạch hoặc Sản phẩm để gắn chứng nhận.'],
                ],
            ], 422);
        }

        if ($batchId !== null && $productId === null) {
            $batch = LoHang::with('loCanhTac')->find($batchId);
            $productId = $batch?->loCanhTac?->Ma_san_pham;
        }

        $filePath = $cert->Duong_dan_tep;
        if ($request->hasFile('file') && $request->file('file')->isValid()) {
            $oldPath = $cert->Duong_dan_tep;
            $filePath = $this->uploadCertificateFile($request->file('file'));
            $this->deleteCertificateFile($oldPath);
        }

        $cert->update([
            'Ma_lo_hang'     => $batchId,
            'Ma_san_pham'    => $productId,
            'Ten_chung_nhan' => trim($validated['Ten_chung_nhan']),
            'To_chuc_cap'    => trim($validated['To_chuc_cap']),
            'Ngay_cap'       => $validated['Ngay_cap'],
            'Ngay_het_han'   => $validated['Ngay_het_han'] ?? null,
            'Duong_dan_tep'  => $filePath,
        ]);

        $cert->load([
            'loHang.loCanhTac.sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh',
            'loHang.loCanhTac.muaVu:Ma_mua_vu,Ten_mua_vu',
            'loHang.maQrTruyXuat:Ma_qr,Ma_lo_hang,Chuoi_ma_qr',
            'sanPham:Ma_san_pham,Ten_san_pham,Don_vi_tinh',
        ]);

        return $this->successResponse(
            message: 'Cập nhật hồ sơ chứng nhận thành công.',
            data: $this->formatCertificateResource($cert)
        );
    }

    /**
     * Xóa hồ sơ chứng nhận / kết quả kiểm định.
     */
    public function destroy(int $id): JsonResponse
    {
        $cert = ChungNhan::find($id);
        if (! $cert) {
            return response()->json([
                'success'    => false,
                'message'    => 'Không tìm thấy hồ sơ chứng nhận.',
                'error_code' => self::ERR_NOT_FOUND,
                'data'       => null,
                'meta'       => null,
                'errors'     => null,
            ], 404);
        }

        $oldPath = $cert->Duong_dan_tep;
        $cert->delete();
        $this->deleteCertificateFile($oldPath);

        return $this->successResponse(message: 'Đã xóa hồ sơ chứng nhận thành công.');
    }

    /**
     * Lưu tệp chứng nhận lên Cloudflare R2 (kèm fallback sang disk 'public' cục bộ).
     */
    private function uploadCertificateFile(UploadedFile $file): string
    {
        $r2Configured = ! empty(env('R2_ACCESS_KEY_ID')) && ! empty(env('R2_BUCKET'));
        if ($r2Configured) {
            try {
                return $this->storage->upload($file, R2StorageService::FOLDER_CERTIFICATES)['url'];
            } catch (Throwable $exception) {
                Log::warning('Certificate upload to R2 failed; falling back to local storage.', [
                    'exception' => $exception::class,
                ]);
            }
        }

        $localPath = Storage::disk('public')->putFile('uploads/certificates', $file);

        return '/storage/' . $localPath;
    }

    /**
     * Xóa tệp cũ trên đúng nơi lưu trữ (R2 hoặc disk public cục bộ).
     */
    private function deleteCertificateFile(?string $path): void
    {
        if (! $path) {
            return;
        }

        if (str_starts_with($path, '/storage/uploads/certificates/')) {
            $relative = ltrim(substr($path, strlen('/storage/')), '/');
            if (Storage::disk('public')->exists($relative)) {
                Storage::disk('public')->delete($relative);
            }

            return;
        }

        $this->storage->delete($path);
    }

    /**
     * Chuẩn hóa cấu trúc dữ liệu chứng nhận trả về Frontend.
     */
    public function formatCertificateResource(ChungNhan $cert): array
    {
        $today = Carbon::now('Asia/Ho_Chi_Minh')->startOfDay();
        $issuedDate = $cert->Ngay_cap ? Carbon::parse($cert->Ngay_cap)->format('Y-m-d') : null;
        $expiryDate = $cert->Ngay_het_han ? Carbon::parse($cert->Ngay_het_han)->format('Y-m-d') : null;

        $daysRemaining = null;
        $validityStatus = 'no_expiry';
        $validityLabel = 'Không thời hạn';

        if ($expiryDate !== null) {
            $daysRemaining = (int) $today->diffInDays(Carbon::parse($expiryDate)->startOfDay(), false);
            if ($daysRemaining < 0) {
                $validityStatus = 'expired';
                $validityLabel = 'Đã hết hạn';
            } elseif ($daysRemaining <= 30) {
                $validityStatus = 'expiring_soon';
                $validityLabel = 'Sắp hết hạn';
            } else {
                $validityStatus = 'valid';
                $validityLabel = 'Còn hiệu lực';
            }
        }

        $rawPath = (string) ($cert->Duong_dan_tep ?? '');
        $extension = strtolower(pathinfo(parse_url($rawPath, PHP_URL_PATH) ?: $rawPath, PATHINFO_EXTENSION));
        $fileKind = $extension === 'pdf' ? 'pdf' : 'image';

        $fileUrl = $rawPath;
        $fileAvailable = true;
        if (str_starts_with($rawPath, 'http://') || str_starts_with($rawPath, 'https://')) {
            $fileUrl = $rawPath;
        } elseif (str_starts_with($rawPath, '/storage/')) {
            $relative = ltrim(substr($rawPath, strlen('/storage/')), '/');
            $fileAvailable = Storage::disk('public')->exists($relative);
            $fileUrl = url($rawPath);
        } elseif ($rawPath !== '') {
            $fileAvailable = file_exists(public_path(ltrim($rawPath, '/')));
            $fileUrl = url($rawPath);
        } else {
            $fileAvailable = false;
        }

        $batch = $cert->loHang;
        $batchCode = null;
        if ($batch) {
            $batchCode = $batch->maQrTruyXuat?->Chuoi_ma_qr
                ?? ('LH-' . Carbon::parse($batch->Ngay_thu_hoach)->format('Ymd') . '-' . str_pad((string) $batch->Ma_lo_hang, 3, '0', STR_PAD_LEFT));
        }

        $productName = $cert->sanPham?->Ten_san_pham
            ?? $batch?->loCanhTac?->sanPham?->Ten_san_pham
            ?? 'Nông sản hữu cơ';

        return [
            'id'              => $cert->Ma_chung_nhan,
            'batch_id'        => $cert->Ma_lo_hang,
            'batch_code'      => $batchCode,
            'batch_harvest_date' => $batch?->Ngay_thu_hoach
                ? Carbon::parse($batch->Ngay_thu_hoach)->format('Y-m-d')
                : null,
            'plot_name'       => $batch?->loCanhTac?->Ten_lo,
            'season_name'     => $batch?->loCanhTac?->muaVu?->Ten_mua_vu,
            'product_id'      => $cert->Ma_san_pham ?? $batch?->loCanhTac?->Ma_san_pham,
            'product_name'    => $productName,
            'name'            => $cert->Ten_chung_nhan,
            'issuer'          => $cert->To_chuc_cap,
            'issued_date'     => $issuedDate,
            'expiry_date'     => $expiryDate,
            'days_remaining'  => $daysRemaining,
            'validity_status' => $validityStatus,
            'validity_label'  => $validityLabel,
            'file_path'       => $rawPath,
            'file_url'        => $fileUrl,
            'file_name'       => basename(parse_url($rawPath, PHP_URL_PATH) ?: $rawPath),
            'file_kind'       => $fileKind,
            'file_available'  => $fileAvailable,
            'created_at'      => $cert->created_at?->toISOString(),
        ];
    }
}
