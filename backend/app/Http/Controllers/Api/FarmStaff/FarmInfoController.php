<?php

/*
 * Luồng nhân viên nông trại: quản lý thông tin cơ sở.
 */

namespace App\Http\Controllers\Api\FarmStaff;

use App\Http\Controllers\Controller;
use App\Models\NongTrai;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class FarmInfoController extends Controller
{
    use ApiResponse;

    /**
     * Lấy thông tin cơ sở nông trại (tên, địa chỉ) - Cached 1 giờ để đạt < 10ms.
     */
    public function show(): JsonResponse
    {
        $farmData = Cache::remember('farm_info_singleton', 3600, function () {
            $farm = NongTrai::first();
            if (! $farm) {
                $farm = NongTrai::create([
                    'Ten_nong_trai' => 'Nông Trại Xanh Củ Chi',
                    'Dia_chi'       => 'Ấp 3, Xã Nhuận Đức, Huyện Củ Chi, TP. Hồ Chí Minh',
                    'Vi_do'         => 10.9985000,
                    'Kinh_do'       => 106.5123000,
                ]);
            }

            return [
                'id'        => $farm->Ma_nong_trai,
                'name'      => $farm->Ten_nong_trai,
                'address'   => $farm->Dia_chi,
                'latitude'  => (float) $farm->Vi_do,
                'longitude' => (float) $farm->Kinh_do,
            ];
        });

        return $this->successResponse(
            message: 'Lấy thông tin cơ sở nông trại thành công.',
            data: $farmData
        );
    }

    /**
     * Cập nhật thông tin cơ sở nông trại (tên, địa chỉ) và xóa cache.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'    => ['nullable', 'string', 'max:200'],
            'address' => ['required', 'string', 'max:255'],
        ], [
            'address.required' => 'Vui lòng nhập địa chỉ cơ sở nông trại.',
            'address.max'      => 'Địa chỉ không được vượt quá 255 ký tự.',
        ]);

        $farm = NongTrai::first();
        if (! $farm) {
            $farm = new NongTrai();
            $farm->Vi_do = 10.9985000;
            $farm->Kinh_do = 106.5123000;
        }

        if (! empty($validated['name'])) {
            $farm->Ten_nong_trai = trim($validated['name']);
        }
        $farm->Dia_chi = trim($validated['address']);
        $farm->save();

        Cache::forget('farm_info_singleton');

        return $this->successResponse(
            message: 'Cập nhật địa chỉ cơ sở nông trại thành công.',
            data: [
                'id'        => $farm->Ma_nong_trai,
                'name'      => $farm->Ten_nong_trai,
                'address'   => $farm->Dia_chi,
                'latitude'  => (float) $farm->Vi_do,
                'longitude' => (float) $farm->Kinh_do,
            ]
        );
    }
}
