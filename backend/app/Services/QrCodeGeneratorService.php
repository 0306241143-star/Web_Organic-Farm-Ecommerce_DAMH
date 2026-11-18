<?php

/*
 * Dịch vụ tạo mã QR định danh và xuất dữ liệu tem nhãn truy xuất nguồn gốc lô hàng (CV04.20 / UC17).
 */

namespace App\Services;

use App\Models\LoHang;
use Carbon\Carbon;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class QrCodeGeneratorService
{
    /**
     * Tạo chuỗi SVG mã QR theo nội dung văn bản / đường link URL.
     */
    public function generateSvg(string $content, int $size = 200): string
    {
        return (string) QrCode::size($size)
            ->color(18, 55, 42) // Xanh đậm thương hiệu XanhFarm (#12372A)
            ->backgroundColor(255, 255, 255)
            ->margin(1)
            ->generate($content);
    }

    /**
     * Tạo mã QR dưới dạng Data URI (Base64 SVG) phục vụ thẻ <img src="...">.
     */
    public function generateDataUri(string $content, int $size = 200): string
    {
        $svg = $this->generateSvg($content, $size);

        return 'data:image/svg+xml;base64,' . base64_encode($svg);
    }

    /**
     * Tạo đường dẫn URL tra cứu công khai cho khách hàng khi quét QR (CV04.11 / UC17).
     */
    public function buildTraceUrl(string $qrCode): string
    {
        $baseUrl = config('app.url', 'http://localhost:5173');

        return rtrim($baseUrl, '/') . '/trace/' . urlencode($qrCode);
    }

    /**
     * Kiểm tra điều kiện tiên quyết và xuất dữ liệu tem in cho lô hàng (UC17).
     *
     * @throws \DomainException nếu lô hàng chưa hoàn tất mốc thu hoạch (UC17 Alternative Flow 2a)
     */
    public function generateBatchQrData(LoHang $batch): array
    {
        $batch->loadMissing([
            'loCanhTac.sanPham',
            'loCanhTac.muaVu',
            'loCanhTac.nhatKyCanhTacs',
            'maQrTruyXuat',
        ]);

        $plot = $batch->loCanhTac;
        if (! $plot) {
            throw new \DomainException('Lô canh tác nguồn của lô hàng không tồn tại.');
        }

        // UC17 Alternative Flow 2a: Kiểm tra lô hàng đã hoàn tất mốc thu hoạch hay chưa
        $hasHarvestLog = $plot->nhatKyCanhTacs
            ->where('Loai_hoat_dong', 'Thu_hoach')
            ->isNotEmpty();

        if (! $hasHarvestLog && $plot->Trang_thai !== 'Da_thu_hoach') {
            throw new \DomainException('Lô hàng chưa hoàn tất mốc thu hoạch. Vui lòng ghi nhận mốc thu hoạch trước khi tạo mã QR truy xuất nguồn gốc.');
        }

        // Lấy hoặc khởi tạo mã QR định danh
        $qrRecord = $batch->maQrTruyXuat;
        $qrCodeString = $qrRecord?->Chuoi_ma_qr;

        if (! $qrCodeString) {
            $qrCodeString = sprintf(
                'QR-LH%s-P%s-%03d',
                Carbon::parse($batch->Ngay_thu_hoach)->format('Ymd'),
                $plot->Ma_lo_canh_tac,
                $batch->Ma_lo_hang
            );
        }

        $traceUrl = $this->buildTraceUrl($qrCodeString);
        $qrSvg = $this->generateSvg($traceUrl, 250);
        $qrDataUri = 'data:image/svg+xml;base64,' . base64_encode($qrSvg);

        return [
            'batch_id'       => $batch->Ma_lo_hang,
            'batch_code'     => $qrCodeString,
            'qr_code'        => $qrCodeString,
            'trace_url'      => $traceUrl,
            'qr_svg'         => $qrSvg,
            'qr_data_uri'    => $qrDataUri,
            'farm_name'      => 'Nông Trại Hữu Cơ XanhFarm Củ Chi',
            'product_name'   => $plot->sanPham?->Ten_san_pham ?? 'Nông sản hữu cơ',
            'product_unit'   => $plot->sanPham?->Don_vi_tinh ?? 'kg',
            'plot_name'      => $plot->Ten_lo,
            'season_name'    => $plot->muaVu?->Ten_mua_vu ?? 'Vụ mùa canh tác',
            'harvest_date'   => Carbon::parse($batch->Ngay_thu_hoach)->format('Y-m-d'),
            'expiry_date'    => Carbon::parse($batch->Han_su_dung)->format('Y-m-d'),
            'standards'      => ['VietGAP', 'Hữu cơ 100%', 'An toàn vệ sinh'],
            'cert_badges'    => ['VietGAP Nông Nghiệp Sạch', 'TCVN 11041:2017'],
            'hotline'        => '1900 8888',
        ];
    }
}
