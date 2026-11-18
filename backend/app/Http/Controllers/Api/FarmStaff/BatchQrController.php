<?php

/*
 * Luồng nhân viên nông trại: tạo QR duy nhất cho lô và xuất dữ liệu in tem (CV04.20 / UC17).
 */

namespace App\Http\Controllers\Api\FarmStaff;

use App\Http\Controllers\Controller;
use App\Models\LoHang;
use App\Models\MaQrTruyXuat;
use App\Services\QrCodeGeneratorService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BatchQrController extends Controller
{
    use ApiResponse;

    public function __construct(
        protected QrCodeGeneratorService $qrService
    ) {}

    /**
     * Sinh hoặc cập nhật mã QR định danh duy nhất cho lô hàng thu hoạch (UC17).
     */
    public function generate(Request $request, int $id): JsonResponse
    {
        $batch = LoHang::findOrFail($id);

        try {
            $labelData = $this->qrService->generateBatchQrData($batch);
        } catch (\DomainException $e) {
            // UC17 Alternative Flow 2a: Lô hàng chưa hoàn tất mốc thu hoạch
            return $this->errorResponse(
                message: $e->getMessage(),
                status: 422,
                errorCode: 'HARVEST_LOG_REQUIRED'
            );
        }

        // Cập nhật hoặc lưu vào bảng ma_qr_truy_xuat
        MaQrTruyXuat::updateOrCreate(
            ['Ma_lo_hang' => $batch->Ma_lo_hang],
            [
                'Ma_nhan_vien_tao' => Auth::id() ?? 1,
                'Chuoi_ma_qr'      => $labelData['qr_code'],
                'Duong_dan_anh_qr' => "/uploads/qr/qr_lh_{$batch->Ma_lo_hang}.png",
            ]
        );

        return $this->successResponse(
            message: 'Sinh mã QR truy xuất nguồn gốc cho lô hàng thành công.',
            data: $labelData
        );
    }

    /**
     * Lấy dữ liệu mẫu tem nhãn QR chuẩn in nhiệt (50x50mm, 70x50mm, A4).
     */
    public function printTemplate(int $id): JsonResponse
    {
        $batch = LoHang::findOrFail($id);

        try {
            $labelData = $this->qrService->generateBatchQrData($batch);
        } catch (\DomainException $e) {
            return $this->errorResponse(
                message: $e->getMessage(),
                status: 422,
                errorCode: 'HARVEST_LOG_REQUIRED'
            );
        }

        return $this->successResponse(
            message: 'Lấy mẫu tem in mã QR thành công.',
            data: $labelData
        );
    }
}
