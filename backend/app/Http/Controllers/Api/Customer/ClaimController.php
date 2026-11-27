<?php

/*
 * Luồng khách hàng: gửi khiếu nại hoặc yêu cầu hoàn tiền kèm bằng chứng lên R2.
 */

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Http\Requests\Customer\StoreClaimRequest;
use App\Models\DonHang;
use App\Models\KhieuNai;
use App\Models\TepBangChung;
use App\Services\R2StorageService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

class ClaimController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        // Cho phép phân trang và giới hạn kích thước trang để tránh truy vấn quá lớn.
        $validated = $request->validate([
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        // Chỉ lấy khiếu nại thuộc tài khoản đang đăng nhập để bảo vệ dữ liệu khách hàng.
        $claims = KhieuNai::query()
            ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
            ->with(['donHang', 'tepBangChungs', 'hoanTien'])
            ->orderByDesc('Ma_khieu_nai')
            ->paginate((int) ($validated['per_page'] ?? 10));

        return $this->paginatedResponse(
            $claims,
            'Lấy danh sách khiếu nại thành công.',
            $claims->getCollection()->map(fn (KhieuNai $claim) => $this->formatClaim($claim))->all()
        );
    }

    public function show(Request $request, int $claimId): JsonResponse
    {
        // Khóa truy vấn theo chủ sở hữu đơn khiếu nại để ngăn truy cập chéo.
        $claim = KhieuNai::query()
            ->where('Ma_nguoi_dung', $request->user()->getAuthIdentifier())
            ->where('Ma_khieu_nai', $claimId)
            ->with(['donHang', 'tepBangChungs', 'hoanTien'])
            ->firstOrFail();

        return $this->successResponse(
            'Lấy chi tiết khiếu nại thành công.',
            $this->formatClaim($claim)
        );
    }

    public function store(
        StoreClaimRequest $request,
        R2StorageService $storage
    ): JsonResponse {
        $validated = $request->validated();
        $userId = (int) $request->user()->getAuthIdentifier();
        $evidenceFiles = $request->file('evidence', []);
        $uploadedPaths = [];
        $claim = null;

        try {
            // Khóa đơn, tạo khiếu nại và ghi bằng chứng trong cùng một transaction.
            $claim = DB::transaction(function () use ($validated, $userId, $storage, $evidenceFiles, &$uploadedPaths): KhieuNai {
                $order = DonHang::query()
                    ->where('Ma_don_hang', $validated['order_id'])
                    ->where('Ma_nguoi_dung', $userId)
                    ->with('giaoHang')
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($order->Trang_thai !== 'Hoan_thanh') {
                    throw ValidationException::withMessages([
                        'order_id' => 'Chỉ có thể gửi khiếu nại cho đơn hàng đã hoàn thành.',
                    ]);
                }

                if (! $order->isClaimWindowOpen()) {
                    throw ValidationException::withMessages([
                        'order_id' => 'Chỉ có thể gửi khiếu nại trong vòng 24 giờ kể từ thời điểm giao hàng thành công.',
                    ]);
                }

                if (KhieuNai::query()->where('Ma_don_hang', $order->Ma_don_hang)->exists()) {
                    throw ValidationException::withMessages([
                        'order_id' => 'Đơn hàng này đã có khiếu nại.',
                    ]);
                }

                $claim = KhieuNai::query()->create([
                    'Ma_don_hang' => $order->Ma_don_hang,
                    'Ma_nguoi_dung' => $userId,
                    'Ly_do' => $validated['reason'],
                    'Mo_ta_chi_tiet' => $validated['description'],
                    'Hinh_thuc_xu_ly' => 'Chua_xac_dinh',
                    'Trang_thai' => 'Cho_xu_ly',
                ]);
                $order->update(['Ma_khieu_nai' => $claim->Ma_khieu_nai]);

                foreach ($evidenceFiles as $file) {
                    $uploaded = $storage->upload($file, R2StorageService::FOLDER_COMPLAINTS);
                    $uploadedPaths[] = $uploaded['path'];
                    TepBangChung::query()->create([
                        'Ma_khieu_nai' => $claim->Ma_khieu_nai,
                        'Loai_tep' => str_starts_with((string) $file->getMimeType(), 'video/')
                            ? 'Video'
                            : 'Hinh_anh',
                        'Duong_dan' => $uploaded['url'],
                    ]);
                }

                return $claim->load(['donHang', 'tepBangChungs', 'hoanTien']);
            });
        } catch (Throwable $exception) {
            // Dọn các tệp đã upload nếu transaction hoặc ghi dữ liệu thất bại.
            foreach ($uploadedPaths as $path) {
                try {
                    Storage::disk(config('filesystems.default_cloud', 'r2'))->delete($path);
                } catch (Throwable $cleanupException) {
                    Log::error('Không thể dọn tệp minh chứng R2 sau khi gửi khiếu nại thất bại.', [
                        'path' => $path,
                        'exception' => $cleanupException::class,
                    ]);
                }
            }

            if (! $exception instanceof ValidationException) {
                Log::warning('Không thể tạo yêu cầu khiếu nại của khách hàng.', [
                    'customer_id' => $userId,
                    'order_id' => $validated['order_id'],
                    'exception' => $exception::class,
                ]);
            }

            throw $exception;
        }

        return $this->successResponse(
            'Gửi yêu cầu khiếu nại thành công.',
            $this->formatClaim($claim),
            status: 201
        );
    }

    private function formatClaim(KhieuNai $claim): array
    {
        return [
            'claim_id' => (int) $claim->Ma_khieu_nai,
            'order_id' => (int) $claim->Ma_don_hang,
            'order_status' => $claim->donHang?->Trang_thai,
            'reason' => $claim->Ly_do,
            'description' => $claim->Mo_ta_chi_tiet,
            'status' => $claim->Trang_thai,
            'resolution' => $claim->Hinh_thuc_xu_ly,
            'submitted_at' => $claim->created_at,
            'resolved_at' => $claim->Ngay_xu_ly,
            'evidence' => $claim->tepBangChungs->map(fn (TepBangChung $evidence) => [
                'id' => (int) $evidence->Ma_tep,
                'type' => $evidence->Loai_tep,
                'url' => $evidence->Duong_dan,
            ])->all(),
            'refund' => $claim->hoanTien ? [
                'amount' => (float) $claim->hoanTien->So_tien,
                'status' => $claim->hoanTien->Trang_thai,
                'processed_at' => $claim->hoanTien->Ngay_hoan,
            ] : null,
        ];
    }
}
