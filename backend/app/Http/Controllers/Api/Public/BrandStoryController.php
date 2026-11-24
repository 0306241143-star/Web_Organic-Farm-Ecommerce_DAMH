<?php

/*
 * Luồng công khai: câu chuyện thương hiệu, triết lý canh tác, chứng nhận và hồ sơ nông trại.
 */

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\CauHinhHeThong;
use App\Models\ChungNhan;
use App\Models\NongTrai;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class BrandStoryController extends Controller
{
    use ApiResponse;

    /**
     * GET /api/brand-story
     * Lấy thông tin nông trại, tiêu chuẩn chứng nhận đang áp dụng và thông tin liên hệ cửa hàng.
     */
    public function show(): JsonResponse
    {
        $payload = Cache::remember('public_brand_story_v1', 300, function (): array {
            $farms = NongTrai::query()
                ->with('hinhAnhs')
                ->orderBy('Ma_nong_trai', 'asc')
                ->get()
                ->map(fn(NongTrai $farm): array => [
                    'id'                 => (int) $farm->Ma_nong_trai,
                    'name'               => $farm->Ten_nong_trai,
                    'address'            => $farm->Dia_chi,
                    'latitude'           => (float) $farm->Vi_do,
                    'longitude'          => (float) $farm->Kinh_do,
                    'brand_story'        => $farm->Cau_chuyen_thuong_hieu,
                    'farming_philosophy' => $farm->Triet_ly_canh_tac,
                    'capacity_profile'   => $farm->Ho_so_nang_luc,
                    'images'             => $farm->hinhAnhs->map(fn($img, $idx): array => [
                        'id'       => (int) $img->Ma_hinh_anh,
                        'url'      => str_starts_with((string) $img->Duong_dan, 'http')
                            ? $img->Duong_dan
                            : url($img->Duong_dan),
                        'caption'  => $img->Mo_ta,
                        'is_cover' => $idx === 0,
                    ])->values()->all(),
                ])
                ->values()
                ->toArray();

            $certifications = ChungNhan::query()
                ->where(function ($query) {
                    $query->whereNull('Ngay_het_han')
                        ->orWhereDate('Ngay_het_han', '>=', now()->toDateString());
                })
                ->pluck('Ten_chung_nhan')
                ->map(function (string $rawName): string {
                    if (str_contains($rawName, 'GlobalGAP')) {
                        return 'GlobalGAP';
                    }
                    if (str_contains($rawName, 'Hữu cơ') || str_contains($rawName, '11041')) {
                        return 'Hữu cơ TCVN 11041';
                    }
                    if (str_contains($rawName, 'VietGAP')) {
                        return 'VietGAP';
                    }
                    if (str_contains($rawName, 'QUATEST') || str_contains($rawName, 'Quatest')) {
                        return 'Quatest 3';
                    }
                    return $rawName;
                })
                ->unique()
                ->values()
                ->toArray();

            return [
                'farms'          => $farms,
                'certifications' => ! empty($certifications)
                    ? $certifications
                    : ['VietGAP', 'Hữu cơ TCVN 11041', 'GlobalGAP'],
                'contact'        => [
                    'hotline'       => (string) CauHinhHeThong::layGiaTri('hotline_cskh', '1900 6868'),
                    'working_hours' => (string) CauHinhHeThong::layGiaTri('gio_lam_viec', '8:00 - 20:00'),
                    'email'         => (string) CauHinhHeThong::layGiaTri('email_lien_he', 'contact@xanhfarm.vn'),
                ],
            ];
        });

        return $this->successResponse(
            message: 'Lấy thông tin nông trại và thương hiệu thành công.',
            data: $payload
        );
    }
}
