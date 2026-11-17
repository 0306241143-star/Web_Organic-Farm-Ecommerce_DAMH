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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SystemSettingController extends Controller
{
    use ApiResponse;

    private array $defaultSettings = [
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

    /**
     * Lấy cấu hình hệ thống từ MySQL (kèm fallback mặc định).
     */
    private function getSettingsFromDatabase(): array
    {
        $settings = $this->defaultSettings;

        $this->ensureTableExists();

        $dbRows = DB::table('cau_hinh_he_thong')->get();
        foreach ($dbRows as $row) {
            $key = $row->Khoa;
            $val = $row->Gia_tri;

            if (array_key_exists($key, $settings)) {
                $default = $settings[$key];
                if (is_int($default)) {
                    $settings[$key] = (int) $val;
                } elseif (is_float($default) || is_numeric($default)) {
                    $settings[$key] = is_numeric($val) ? (float) $val : $val;
                } else {
                    $settings[$key] = $val;
                }
            } else {
                $settings[$key] = $val;
            }
        }

        return $settings;
    }

    /**
     * Đảm bảo bảng cau_hinh_he_thong luôn tồn tại trong CSDL.
     */
    private function ensureTableExists(): void
    {
        if (! Schema::hasTable('cau_hinh_he_thong')) {
            Schema::create('cau_hinh_he_thong', function ($table) {
                $table->string('Khoa', 100)->primary();
                $table->text('Gia_tri')->nullable();
                $table->string('Mo_ta', 255)->nullable();
                $table->timestamp('created_at')->nullable()->useCurrent();
                $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();
            });
        }
    }

    /**
     * Lấy cấu hình hệ thống hiện tại.
     */
    public function index(): JsonResponse
    {
        $settings = Cache::remember('system_settings_config', 3600, function () {
            return $this->getSettingsFromDatabase();
        });

        return $this->successResponse(
            message: 'Lấy cấu hình hệ thống thành công.',
            data: $settings
        );
    }

    /**
     * Cập nhật cấu hình hệ thống và đồng bộ vào MySQL.
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

        $this->ensureTableExists();

        $filtered = array_filter($validated, fn ($val) => ! is_null($val));

        // Lưu từng cặp Khoa - Gia_tri vào bảng cau_hinh_he_thong
        foreach ($filtered as $key => $value) {
            DB::table('cau_hinh_he_thong')->updateOrInsert(
                ['Khoa' => $key],
                [
                    'Gia_tri'    => (string) $value,
                    'updated_at' => now(),
                ]
            );
        }

        // Đọc lại từ CSDL và lưu đệm vào Cache
        $updated = $this->getSettingsFromDatabase();
        Cache::put('system_settings_config', $updated, 86400);

        return $this->successResponse(
            message: 'Cập nhật cấu hình hệ thống thành công.',
            data: $updated
        );
    }
}
