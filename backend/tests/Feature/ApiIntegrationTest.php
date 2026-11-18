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

        // 5. Kiểm tra UC14.1 2a: Chặn mốc thời gian trong tương lai
        $this->postJson("/api/farm/farming-logs", [
            'Ma_lo_canh_tac'      => $plotId,
            'Loai_hoat_dong'      => 'Gieo_hat',
            'Thoi_gian_thuc_hien' => now()->addDays(2)->toDateTimeString(),
            'Noi_dung'            => 'Gieo hạt ngày tương lai không hợp lệ.',
        ], $headers)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['Thoi_gian_thuc_hien']);

        // 5b. Ghi nhật ký canh tác hợp lệ kèm tệp hình ảnh
        $logRes = $this->post("/api/farm/farming-logs", [
            'Ma_lo_canh_tac'      => $plotId,
            'Loai_hoat_dong'      => 'Gieo_hat',
            'Thoi_gian_thuc_hien' => now()->subHours(2)->toDateTimeString(),
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

    public function test_farm_staff_harvest_batch_creation_and_wastage_flow(): void
    {
        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--seed' => true]);

        $farmStaff = \App\Models\NguoiDung::where('Email', 'farm.kythuat@nongsansach.vn')->first();
        $this->assertNotNull($farmStaff);
        $token = $farmStaff->createToken('test_batch_token')->plainTextToken;
        $headers = ['Authorization' => "Bearer {$token}"];

        // 1. Tạo mùa vụ và lô canh tác kiểm thử
        $season = \App\Models\MuaVu::create([
            'Ten_mua_vu'   => 'Vụ Kiểm Thử Thu Hoạch ' . uniqid(),
            'Ngay_bat_dau' => '2027-04-01',
            'Trang_thai'   => 'Dang_dien_ra',
        ]);

        $plot = \App\Models\LoCanhTac::create([
            'Ma_mua_vu'       => $season->Ma_mua_vu,
            'Ma_san_pham'     => 1,
            'Ten_lo'          => 'Lô Cần Thu Hoạch T01',
            'Dien_tich'       => 450,
            'Ngay_gieo_trong' => '2027-04-02',
            'Trang_thai'      => 'Dang_canh_tac',
        ]);

        // 2. Ghi nhận mốc nhật ký Thu_hoach trước đó (Mô phỏng "Trỏ từ mốc Thu hoạch")
        $harvestLog = \App\Models\NhatKyCanhTac::create([
            'Ma_lo_canh_tac'      => $plot->Ma_lo_canh_tac,
            'Ma_nhan_vien'        => $farmStaff->Ma_nguoi_dung,
            'Loai_hoat_dong'      => 'Thu_hoach',
            'Thoi_gian_thuc_hien' => '2027-05-15 08:30:00',
            'Noi_dung'            => 'Tiến hành thu hoạch đợt 1 toàn bộ diện tích.',
        ]);

        // 3. Gọi API lấy danh sách lô đủ điều kiện thu hoạch
        $eligibleRes = $this->getJson('/api/farm/batches/eligible-plots', $headers)
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertTrue(collect($eligibleRes->json('data'))->contains('id', $plot->Ma_lo_canh_tac));

        // 4. Tạo lô hàng thu hoạch mới (CV04.18)
        $batchRes = $this->postJson('/api/farm/batches', [
            'Ma_lo_canh_tac'     => $plot->Ma_lo_canh_tac,
            'Ngay_thu_hoach'     => '2026-11-17',
            'Han_su_dung'        => '2026-11-25',
            'So_luong_thu_hoach' => 150.5,
            'Ghi_chu'            => 'Lô thu hoạch thử nghiệm đạt chuẩn VietGAP',
        ], $headers)
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.harvest_quantity', 150.5)
            ->assertJsonPath('data.remaining_quantity', 150.5)
            ->assertJsonPath('data.plot_id', $plot->Ma_lo_canh_tac);

        $batchId = $batchRes->json('data.id');
        $this->assertNotEmpty($batchRes->json('data.qr.code'));

        // Kiểm tra lô canh tác đã tự động chuyển sang Da_thu_hoach
        $this->assertEquals('Da_thu_hoach', $plot->fresh()->Trang_thai);

        // 5. Lấy danh sách lô hàng thu hoạch
        $this->getJson('/api/farm/batches', $headers)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['data' => ['batches', 'stats']]);

        // 6. Xem chi tiết lô hàng thu hoạch
        $this->getJson("/api/farm/batches/{$batchId}", $headers)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $batchId)
            ->assertJsonStructure(['data' => ['timeline', 'disposals']]);

        // 7. Ghi nhận hao hụt / xuất hủy (CV04.21)
        $this->postJson("/api/farm/batches/{$batchId}/wastage", [
            'quantity' => 5.5,
            'type'     => 'Hao_hut',
            'reason'   => 'Dập nát trong quá trình sơ chế đóng gói',
        ], $headers)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.remaining_quantity', 145);

        // 8. Dọn dẹp bản ghi kiểm thử
        \App\Models\BienDongKho::where('Ma_lo_hang', $batchId)->delete();
        \App\Models\MaQrTruyXuat::where('Ma_lo_hang', $batchId)->delete();
        \App\Models\LoHang::destroy($batchId);
        $harvestLog->delete();
        $plot->delete();
        $season->delete();
        $farmStaff->tokens()->delete();
    }
}
