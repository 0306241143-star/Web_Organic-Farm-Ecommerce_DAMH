<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Carbon\Carbon;
use Tests\TestCase;

class AdminApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_admin_dashboard_reports_and_system_health(): void
    {
        $adminUser = NguoiDung::where('Email', 'admin@nongsansach.vn')->first();
        if (! $adminUser) {
            $this->markTestSkipped('Admin user not found.');
        }

        $token = $adminUser->createToken('test_admin_token')->plainTextToken;
        $headers = ['Authorization' => 'Bearer ' . $token];

        $start = microtime(true);
        $response = $this->getJson('/api/admin/reports/dashboard', $headers);
        $durationMs = (microtime(true) - $start) * 1000;

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'revenue' => ['total', 'orders_count', 'orders_by_status'],
                    'farm'    => ['active_seasons', 'total_plots', 'active_plots'],
                    'users'   => ['total', 'active'],
                    'system_health' => ['api_response_ms', 'db_connection', 'status'],
                ],
            ]);

        // SLA Check: response time under 500ms
        $this->assertLessThan(500, $durationMs, "Admin dashboard API response time ({$durationMs}ms) exceeded 500ms SLA.");
    }

    public function test_admin_dashboard_returns_period_metrics_and_daily_series(): void
    {
        $adminUser = NguoiDung::where('Email', 'admin@nongsansach.vn')->firstOrFail();
        $token = $adminUser->createToken('test_admin_report_metrics')->plainTextToken;
        $headers = ['Authorization' => 'Bearer ' . $token];

        Carbon::setTestNow('2026-11-26 12:00:00');
        try {
            $response = $this->getJson('/api/admin/reports/dashboard?period=30d', $headers)
                ->assertOk()
                ->assertJsonPath('success', true)
                ->assertJsonPath('data.period.key', '30d')
                ->assertJsonPath('data.revenue.orders_count', 3)
                ->assertJsonPath('data.customers.unique_customers', 1)
                ->assertJsonPath('data.customers.repeat_customers', 1)
                ->assertJsonPath('data.wastage.quantity', 5)
                ->assertJsonPath('data.wastage.harvested_quantity', 1695)
                ->assertJsonStructure([
                    'data' => [
                        'period' => ['start_date', 'end_date'],
                        'series' => [['date', 'revenue', 'orders', 'harvest_quantity', 'wastage_quantity']],
                        'wastage' => ['rate', 'by_type' => ['Hao_hut', 'Xuat_huy']],
                        'customers' => ['repeat_rate'],
                    ],
                ]);

            $this->assertSame(30, count($response->json('data.series')));
            $this->assertSame(351000.0, (float) $response->json('data.revenue.total'));
            $this->assertSame(100.0, (float) $response->json('data.customers.repeat_rate'));
        } finally {
            Carbon::setTestNow();
        }
    }

    public function test_admin_user_management_pagination_and_role_protection(): void
    {
        $adminUser = NguoiDung::where('Email', 'admin@nongsansach.vn')->first();
        if (! $adminUser) {
            $this->markTestSkipped('Admin user not found.');
        }

        $token = $adminUser->createToken('test_admin_token_2')->plainTextToken;
        $headers = ['Authorization' => 'Bearer ' . $token];

        // 1. Phân trang người dùng
        $this->getJson('/api/admin/users?per_page=5', $headers)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'message',
                'data',
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        // 2. Bảo vệ: Không thể khóa tài khoản Admin cao nhất
        $this->putJson("/api/admin/users/{$adminUser->Ma_nguoi_dung}/status", [
            'status' => 'Khoa',
        ], $headers)
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_admin_system_settings_crud(): void
    {
        $adminUser = NguoiDung::where('Email', 'admin@nongsansach.vn')->first();
        if (! $adminUser) {
            $this->markTestSkipped('Admin user not found.');
        }

        $token = $adminUser->createToken('test_admin_token_3')->plainTextToken;
        $headers = ['Authorization' => 'Bearer ' . $token];

        // 1. Lấy cài đặt hệ thống
        $this->getJson('/api/admin/settings', $headers)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.delivery_max_distance_km', 25);

        // 2. Cập nhật cài đặt
        $this->putJson('/api/admin/settings', [
            'delivery_max_distance_km' => 30,
            'fefo_warning_days'        => 4,
        ], $headers)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.delivery_max_distance_km', 30);
    }
}
