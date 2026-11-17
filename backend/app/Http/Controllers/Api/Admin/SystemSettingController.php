<?php

/*
 * Luồng quản trị: cấu hình tham số hệ thống nông sản (CV04.28).
 */

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SystemSettingController extends Controller
{
    use ApiResponse;

    /**
     * Lấy cấu hình hệ thống hiện tại.
     */
    public function index(): JsonResponse
    {
        $settings = Cache::remember('system_settings_config', 3600, function () {
            return [
                'delivery_max_distance_km' => 25,
                'shipping_fee_base'        => 20000,
                'shipping_fee_per_km'      => 5000,
                'fefo_warning_days'        => 3,
                'flash_sale_discount_pct'  => 40,
                'reward_point_rate'        => 1000, // 1000 VND = 1 điểm
                'auto_cancel_unpaid_hours' => 24,
                'support_hotline'          => '1900 8888',
                'support_email'            => 'cskh@nongsansach.vn',
            ];
        });

        return $this->successResponse(
            message: 'Lấy cấu hình hệ thống thành công.',
            data: $settings
        );
    }

    /**
     * Cập nhật cấu hình hệ thống.
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'delivery_max_distance_km' => ['nullable', 'numeric', 'min:1', 'max:100'],
            'shipping_fee_base'        => ['nullable', 'numeric', 'min:0'],
            'shipping_fee_per_km'      => ['nullable', 'numeric', 'min:0'],
            'fefo_warning_days'        => ['nullable', 'integer', 'min:1', 'max:30'],
            'flash_sale_discount_pct'  => ['nullable', 'integer', 'min:5', 'max:90'],
            'auto_cancel_unpaid_hours' => ['nullable', 'integer', 'min:1', 'max:72'],
            'support_hotline'          => ['nullable', 'string', 'max:20'],
            'support_email'            => ['nullable', 'email'],
        ]);

        $current = Cache::get('system_settings_config', [
            'delivery_max_distance_km' => 25,
            'shipping_fee_base'        => 20000,
            'shipping_fee_per_km'      => 5000,
            'fefo_warning_days'        => 3,
            'flash_sale_discount_pct'  => 40,
            'reward_point_rate'        => 1000,
            'auto_cancel_unpaid_hours' => 24,
            'support_hotline'          => '1900 8888',
            'support_email'            => 'cskh@nongsansach.vn',
        ]);

        $updated = array_merge($current, array_filter($validated, fn($val) => !is_null($val)));
        Cache::put('system_settings_config', $updated, 86400);

        return $this->successResponse(
            message: 'Cập nhật cấu hình hệ thống thành công.',
            data: $updated
        );
    }
}
