<?php

/*
 * Luồng công khai: tra cứu QR lô hàng, ngày thu hoạch, nhật ký và kiểm định.
 */

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\MaQrTruyXuat;
use App\Traits\ApiResponse;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class QrTraceController extends Controller
{
    use ApiResponse;

    public function show(string $code): JsonResponse
    {
        $qrCode = MaQrTruyXuat::query()
            ->with([
                'loHang.chungNhans',
                'loHang.loCanhTac.muaVu.nongTrai',
                'loHang.loCanhTac.sanPham.nongTrai',
            ])
            ->where('Chuoi_ma_qr', $code)
            ->first();

        if (! $qrCode) {
            return $this->errorResponse(
                message: 'Mã QR không tồn tại hoặc không hợp lệ.',
                status: 404,
                errorCode: self::ERR_NOT_FOUND
            );
        }

        $qrCode->increment('So_luot_quet');

        $batch = $qrCode->loHang;
        $plot = $batch?->loCanhTac;
        $season = $plot?->muaVu;
        $product = $plot?->sanPham;
        $farm = $season?->nongTrai ?? $product?->nongTrai;
        if ($plot && $batch) {
            $plot->load([
                'nhatKyCanhTacs' => fn ($query) => $query
                    ->whereDate('Thoi_gian_thuc_hien', '<=', $batch->Ngay_thu_hoach)
                    ->orderBy('Thoi_gian_thuc_hien'),
                'nhatKyCanhTacs.tepNhatKys',
            ]);
        }
        $logs = $plot?->nhatKyCanhTacs ?? collect();

        return $this->successResponse(
            message: 'Lấy thông tin truy xuất nguồn gốc thành công.',
            data: [
                'qr_code' => $qrCode->Chuoi_ma_qr,
                'scan_count' => (int) $qrCode->So_luot_quet,
                'product' => $product ? [
                    'id' => (int) $product->Ma_san_pham,
                    'name' => $product->Ten_san_pham,
                    'unit' => $product->Don_vi_tinh,
                    'image_url' => $this->publicFileUrl($product->Hinh_anh_dai_dien),
                ] : null,
                'farm' => $farm ? [
                    'name' => $farm->Ten_nong_trai,
                    'address' => $farm->Dia_chi,
                ] : null,
                'season' => $season ? [
                    'name' => $season->Ten_mua_vu,
                    'start_date' => $season->Ngay_bat_dau,
                    'end_date' => $season->Ngay_ket_thuc,
                ] : null,
                'plot' => $plot ? [
                    'name' => $plot->Ten_lo,
                    'planting_date' => $plot->Ngay_gieo_trong,
                ] : null,
                'batch' => $batch ? [
                    'harvest_date' => $batch->Ngay_thu_hoach,
                    'expiry_date' => $batch->Han_su_dung,
                    'is_expired' => Carbon::parse($batch->Han_su_dung)->lt(Carbon::today()),
                    'status' => $batch->Trang_thai,
                ] : null,
                'cultivation_logs' => $logs->map(fn ($log) => [
                    'id' => (int) $log->Ma_nhat_ky,
                    'activity_type' => $log->Loai_hoat_dong,
                    'activity_label' => $this->activityLabel($log->Loai_hoat_dong),
                    'occurred_at' => $log->Thoi_gian_thuc_hien?->format('Y-m-d H:i:s'),
                    'content' => $log->Noi_dung,
                    'media' => $log->tepNhatKys->map(fn ($file) => [
                        'type' => $file->Loai_tep,
                        'url' => $this->publicFileUrl($file->Duong_dan),
                        'description' => $file->Mo_ta,
                    ])->values(),
                ])->values(),
                'certifications' => ($batch?->chungNhans ?? collect())
                    ->map(fn ($certificate) => [
                        'id' => (int) $certificate->Ma_chung_nhan,
                        'name' => $certificate->Ten_chung_nhan,
                        'issuer' => $certificate->To_chuc_cap,
                        'issued_date' => $certificate->Ngay_cap,
                        'expiry_date' => $certificate->Ngay_het_han,
                        'file_url' => $this->publicFileUrl($certificate->Duong_dan_tep),
                    ])
                    ->values(),
            ]
        );
    }

    private function activityLabel(string $activityType): string
    {
        return match ($activityType) {
            'Gieo_hat' => 'Gieo hạt & ươm cây',
            'Bon_phan' => 'Bón phân',
            'Tuoi_tieu' => 'Tưới tiêu',
            'Thu_hoach' => 'Thu hoạch',
            default => 'Hoạt động khác',
        };
    }

    private function publicFileUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        if (preg_match('/^https?:\/\//i', $path)) {
            return $path;
        }

        return url('/' . ltrim($path, '/'));
    }
}
