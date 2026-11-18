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

    public function test_farm_staff_certificate_upload_and_batch_attachment_flow(): void
    {
        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--seed' => true]);
        \Illuminate\Support\Facades\Storage::fake('public');

        $farmStaff = \App\Models\NguoiDung::where('Email', 'farm.kythuat@nongsansach.vn')->first();
        $this->assertNotNull($farmStaff);
        $product = \App\Models\SanPham::first();
        $this->assertNotNull($product);

        $token = $farmStaff->createToken('test-farm-cert')->plainTextToken;
        $headers = ['Authorization' => 'Bearer ' . $token];

        // 1. Tạo mùa vụ, lô canh tác và lô hàng thu hoạch để gắn chứng nhận
        $season = \App\Models\MuaVu::create([
            'Ten_mua_vu'   => 'Vụ Kiểm Định Test ' . now()->timestamp,
            'Ngay_bat_dau' => now()->subDays(25)->toDateString(),
            'Trang_thai'   => 'Dang_dien_ra',
        ]);

        $plot = \App\Models\LoCanhTac::create([
            'Ma_mua_vu'       => $season->Ma_mua_vu,
            'Ma_san_pham'     => $product->Ma_san_pham,
            'Ten_lo'          => 'Lô Kiểm Định K01',
            'Dien_tich'       => 600,
            'Ngay_gieo_trong' => now()->subDays(20)->toDateString(),
            'Trang_thai'      => 'Da_thu_hoach',
        ]);

        $batch = \App\Models\LoHang::create([
            'Ma_lo_canh_tac'         => $plot->Ma_lo_canh_tac,
            'Ma_nhan_vien_phu_trach' => $farmStaff->Ma_nguoi_dung,
            'Ngay_thu_hoach'         => now()->toDateString(),
            'Han_su_dung'            => now()->addDays(7)->toDateString(),
            'So_luong_thu_hoach'     => 90,
            'So_luong_con_lai'       => 90,
            'Trang_thai'             => 'Con_hang',
        ]);

        // 2. Kiểm tra validation lỗi: thiếu lô hàng & sản phẩm, ngày hết hạn < ngày cấp
        $this->post('/api/farm/certificates', [
            'Ten_chung_nhan' => 'Chứng nhận VietGAP Test',
            'To_chuc_cap'    => 'QUACERT',
            'Ngay_cap'       => now()->toDateString(),
            'Ngay_het_han'   => now()->subDays(1)->toDateString(),
            'file'           => UploadedFile::fake()->create('bad.exe', 50, 'application/x-msdownload'),
        ], array_merge($headers, ['Accept' => 'application/json']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['Ma_lo_hang', 'Ngay_het_han', 'file']);

        // 3. Tải lên tệp PDF chứng nhận hợp lệ và gắn trực tiếp vào Lô hàng
        $pdfFile = UploadedFile::fake()->create('vietgap_lo_k01.pdf', 180, 'application/pdf');
        $createRes = $this->post('/api/farm/certificates', [
            'Ma_lo_hang'     => $batch->Ma_lo_hang,
            'Ten_chung_nhan' => 'Phiếu kiểm định mẫu đất & nước Quatest 3',
            'To_chuc_cap'    => 'QUATEST 3',
            'Ngay_cap'       => now()->subDays(5)->toDateString(),
            'Ngay_het_han'   => now()->addMonths(12)->toDateString(),
            'file'           => $pdfFile,
        ], array_merge($headers, ['Accept' => 'application/json']))
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.batch_id', $batch->Ma_lo_hang)
            ->assertJsonPath('data.product_id', $product->Ma_san_pham)
            ->assertJsonPath('data.file_kind', 'pdf')
            ->assertJsonPath('data.validity_status', 'valid');

        $certId = $createRes->json('data.id');
        $this->assertNotNull($certId);

        // 4. Kiểm tra xuất hiện trong GET /api/farm/certificates và đồng bộ trong GET /api/farm/batches/{id}
        $this->getJson('/api/farm/certificates?batch_id=' . $batch->Ma_lo_hang, $headers)
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.certificates.0.id', $certId);

        $this->getJson('/api/farm/batches/' . $batch->Ma_lo_hang, $headers)
            ->assertOk()
            ->assertJsonPath('data.certificates_count', 1)
            ->assertJsonPath('data.certificates.0.id', $certId);

        // 5. Cập nhật tên chứng nhận qua _method=PUT
        $this->post('/api/farm/certificates/' . $certId, [
            '_method'        => 'PUT',
            'Ma_lo_hang'     => $batch->Ma_lo_hang,
            'Ten_chung_nhan' => 'Chứng nhận VietGAP Trồng trọt (Cập nhật)',
            'To_chuc_cap'    => 'Viện Nghiên cứu Rau quả',
            'Ngay_cap'       => now()->subDays(5)->toDateString(),
            'Ngay_het_han'   => now()->addMonths(18)->toDateString(),
        ], array_merge($headers, ['Accept' => 'application/json']))
            ->assertOk()
            ->assertJsonPath('data.name', 'Chứng nhận VietGAP Trồng trọt (Cập nhật)');

        // 6. Xóa chứng nhận và kiểm tra xóa mùa vụ chứa lô hàng thu hoạch không bị lỗi SQL 1054
        $this->deleteJson('/api/farm/certificates/' . $certId, [], $headers)
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('chung_nhan', ['Ma_chung_nhan' => $certId]);

        $this->deleteJson('/api/farm/seasons/' . $season->Ma_mua_vu, [], $headers)
            ->assertOk()
            ->assertJsonPath('success', true);

        $this->assertDatabaseMissing('mua_vu', ['Ma_mua_vu' => $season->Ma_mua_vu]);
        $this->assertDatabaseMissing('lo_hang', ['Ma_lo_hang' => $batch->Ma_lo_hang]);

        $farmStaff->tokens()->delete();
    }

    public function test_public_catalog_categories_products_search_and_filters_flow(): void
    {
        \Illuminate\Support\Facades\Artisan::call('migrate:fresh', ['--seed' => true]);

        // 1. Lấy danh sách danh mục công khai (không cần đăng nhập)
        $categoriesRes = $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonCount(4, 'data')
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [[
                    'id',
                    'name',
                    'description',
                    'product_count',
                    'in_stock_product_count',
                    'min_price',
                    'max_price',
                ]],
            ]);

        $this->assertEquals(5, $categoriesRes->json('data.0.product_count'));

        // 2. Lấy danh sách sản phẩm công khai mặc định 12 sản phẩm/trang kèm facets và phân trang (16 SP -> 2 trang)
        $productsRes = $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('meta.per_page', 12)
            ->assertJsonPath('meta.total', 16)
            ->assertJsonPath('meta.last_page', 2)
            ->assertJsonCount(12, 'data')
            ->assertJsonStructure([
                'data' => [[
                    'id',
                    'name',
                    'price',
                    'effective_price',
                    'is_flash_sale',
                    'available_stock',
                    'in_stock',
                    'certification_standards',
                ]],
                'meta' => [
                    'current_page',
                    'per_page',
                    'total',
                    'last_page',
                    'facets' => ['available_certifications', 'price_bounds', 'summary'],
                ],
            ]);

        $this->assertGreaterThan(0, count($productsRes->json('meta.facets.available_certifications')));

        // 2b. Trang 2 hiển thị 4 sản phẩm còn lại
        $this->getJson('/api/products?page=2')
            ->assertOk()
            ->assertJsonPath('meta.current_page', 2)
            ->assertJsonCount(4, 'data');

        // 3. Tìm kiếm tiếng Việt không dấu (ca chua -> Cà chua Beef & Cà chua bi mật)
        $this->getJson('/api/products?search=ca%20chua')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        // 4. Lọc theo danh mục (category=1 -> 5 loại rau ăn lá)
        $this->getJson('/api/products?category=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 5);

        // 5. Lọc theo khoảng giá thực tế (effective_price từ 38000 đến 50000 -> 5 sản phẩm)
        $this->getJson('/api/products?min_price=38000&max_price=50000')
            ->assertOk()
            ->assertJsonPath('meta.total', 5);

        // 6. Lọc theo chứng nhận chất lượng (VietGAP -> 4 SP; GlobalGAP -> 2 SP)
        $this->getJson('/api/products?cert=VietGAP')
            ->assertOk()
            ->assertJsonPath('meta.total', 4);

        $this->getJson('/api/products?cert=GlobalGAP')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        // 7. Lọc chỉ hiện sản phẩm còn hàng & đang Flash Sale
        $this->getJson('/api/products?in_stock=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 13);

        $this->getJson('/api/products?flash_sale=1')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', 1)
            ->assertJsonPath('data.0.effective_price', 25000);

        // 8. Sắp xếp theo giá tăng dần & giảm dần + phân trang
        $ascRes = $this->getJson('/api/products?sort=price_asc&per_page=12&page=1')
            ->assertOk()
            ->assertJsonPath('meta.last_page', 2);
        $this->assertEquals(15000, $ascRes->json('data.0.effective_price'));

        $descRes = $this->getJson('/api/products?sort=price_desc&per_page=12&page=1')
            ->assertOk();
        $this->assertEquals(145000, $descRes->json('data.0.effective_price'));

        // 9. Xem chi tiết sản phẩm & kiểm tra 404
        $this->getJson('/api/products/1')
            ->assertOk()
            ->assertJsonPath('data.id', 1)
            ->assertJsonStructure(['data' => ['batches', 'related_products', 'certifications']]);

        $this->getJson('/api/products/999999')
            ->assertNotFound()
            ->assertJsonPath('error_code', 'NOT_FOUND');
    }
}
