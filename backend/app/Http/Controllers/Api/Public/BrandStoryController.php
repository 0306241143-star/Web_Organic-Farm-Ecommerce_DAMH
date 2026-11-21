<?php

/*
 * Luồng công khai: câu chuyện thương hiệu, triết lý canh tác và hồ sơ nông trại.
 */

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class BrandStoryController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $farm = DB::table('nong_trai')
            ->orderBy('Ma_nong_trai')
            ->first();

        if (! $farm) {
            return $this->successResponse(
                message: 'Chưa có thông tin câu chuyện thương hiệu.',
                data: null
            );
        }

        $images = DB::table('hinh_anh_nong_trai')
            ->where('Ma_nong_trai', $farm->Ma_nong_trai)
            ->orderBy('Thu_tu')
            ->get()
            ->map(fn ($image) => [
                'id' => $image->Ma_hinh_anh,
                'url' => $image->Duong_dan,
                'description' => $image->Mo_ta,
                'order' => $image->Thu_tu,
            ])
            ->values();

        return $this->successResponse(
            message: 'Lấy câu chuyện thương hiệu thành công.',
            data: [
                'id' => $farm->Ma_nong_trai,
                'name' => $farm->Ten_nong_trai,
                'address' => $farm->Dia_chi,
                'latitude' => $farm->Vi_do,
                'longitude' => $farm->Kinh_do,
                'brand_story' => $farm->Cau_chuyen_thuong_hieu,
                'cultivation_philosophy' => $farm->Triet_ly_canh_tac,
                'capability_profile' => $farm->Ho_so_nang_luc,
                'images' => $images,
            ]
        );
    }
}
