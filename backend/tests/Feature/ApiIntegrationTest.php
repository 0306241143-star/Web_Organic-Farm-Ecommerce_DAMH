<?php

namespace Tests\Feature;

use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class ApiIntegrationTest extends TestCase
{
    public function test_api_response_contract_and_http_error_statuses(): void
    {
        $this->getJson('/api/ping')
            ->assertOk()
            ->assertJsonStructure(['success', 'message', 'error_code', 'data', 'meta', 'errors'])
            ->assertJsonPath('success', true)
            ->assertJsonPath('error_code', null);

        $this->getJson('/api/test/error-401')
            ->assertUnauthorized()
            ->assertJsonPath('error_code', 'UNAUTHENTICATED');

        $this->getJson('/api/test/error-403')
            ->assertForbidden()
            ->assertJsonPath('error_code', 'FORBIDDEN');

        $this->getJson('/api/not-found')
            ->assertNotFound()
            ->assertJsonPath('error_code', 'NOT_FOUND');

        $this->getJson('/api/test/json')
            ->assertStatus(405)
            ->assertJsonPath('error_code', 'METHOD_NOT_ALLOWED');

        $this->postJson('/api/test/json', [])
            ->assertUnprocessable()
            ->assertJsonPath('error_code', 'VALIDATION_ERROR')
            ->assertJsonStructure(['errors' => ['ten_san_pham', 'so_luong']]);

        config(['app.debug' => false]);
        $this->getJson('/api/test/error-500')
            ->assertServerError()
            ->assertJsonPath('error_code', 'SERVER_ERROR');
    }

    public function test_json_and_multipart_requests_are_accepted(): void
    {
        $this->postJson('/api/test/json', [
            'ten_san_pham' => 'Rau cải',
            'so_luong' => 3,
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.so_luong', 3);

        $this->post('/api/test/upload', [
            'mo_ta' => 'Ảnh kiểm thử',
            'file' => UploadedFile::fake()->create('quality.jpg', 10, 'image/jpeg'),
        ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.original_name', 'quality.jpg');
    }

    public function test_farm_staff_seasons_and_farming_logs_flow(): void
    {
        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--seed' => true]);

        $staffUser = \App\Models\NguoiDung::where('Email', 'farm.kythuat@nongsansach.vn')->first();
        if (! $staffUser) {
            $this->markTestSkipped('Staff user not found in database.');
        }

        $token = $staffUser->createToken('test_staff_token')->plainTextToken;
        $headers = ['Authorization' => 'Bearer ' . $token];

        // 1. Lấy danh sách mùa vụ
        $this->getJson('/api/farm/seasons', $headers)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['success', 'message', 'data' => [['id', 'name', 'status', 'plots']]]);

        // 2. Tạo mùa vụ mới
        $newSeasonRes = $this->postJson('/api/farm/seasons', [
            'name'       => 'Vụ Xuân Hè 2027 - Khu Mới',
            'start_date' => '2027-03-01',
            'end_date'   => '2027-06-30',
            'status'     => 'Dang_dien_ra',
        ], $headers)
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Vụ Xuân Hè 2027 - Khu Mới');

        $seasonId = $newSeasonRes->json('data.id');

        // 3. Thêm lô canh tác vào mùa vụ mới
        $firstProduct = \App\Models\SanPham::first();
        $plotRes = $this->postJson("/api/farm/seasons/{$seasonId}/plots", [
            'product_id'    => $firstProduct->Ma_san_pham,
            'plot_name'     => 'Lô Thử Nghiệm X01',
            'area_m2'       => 500.5,
            'planting_date' => '2027-03-05',
        ], $headers)
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.plot_name', 'Lô Thử Nghiệm X01');

        $plotId = $plotRes->json('data.id');

        // 4. Lấy danh sách nông sản
        $this->getJson('/api/farm/products', $headers)
            ->assertOk()
            ->assertJsonPath('success', true);

        // 5. Ghi nhật ký canh tác kèm tệp hình ảnh
        $logRes = $this->post("/api/farm/farming-logs", [
            'Ma_lo_canh_tac'      => $plotId,
            'Loai_hoat_dong'      => 'Gieo_hat',
            'Thoi_gian_thuc_hien' => '2027-03-05 08:30:00',
            'Noi_dung'            => 'Gieo hạt giống hữu cơ kiểm định.',
            'media'               => [
                UploadedFile::fake()->image('gieo_hat.jpg', 600, 400),
            ],
        ], array_merge($headers, ['Accept' => 'application/json']))
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.plot_id', $plotId);

        $logId = $logRes->json('data.id');

        // 6. Lấy danh sách nhật ký theo lô
        $this->getJson("/api/farm/farming-logs?plot_id={$plotId}", $headers)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(1, 'data');

        // 7. Dọn dẹp bản ghi kiểm thử
        \App\Models\NhatKyCanhTac::destroy($logId);
        \App\Models\LoCanhTac::destroy($plotId);
        \App\Models\MuaVu::destroy($seasonId);
    }
}
