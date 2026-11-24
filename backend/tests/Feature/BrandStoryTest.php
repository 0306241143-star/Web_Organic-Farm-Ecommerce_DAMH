<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BrandStoryTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_brand_story_is_public_and_returns_farm_process_and_valid_certificate_files(): void
    {
        DB::table('chung_nhan')->insert([
            'Ma_san_pham' => 1,
            'Ten_chung_nhan' => 'Chứng nhận VietGAP đã hết hạn',
            'To_chuc_cap' => 'Đơn vị kiểm định',
            'Ngay_cap' => '2024-01-01',
            'Ngay_het_han' => '2024-12-31',
            'Duong_dan_tep' => '/uploads/certs/expired.pdf',
        ]);

        $this->getJson('/api/brand-story')
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'error_code',
                'data' => [
                    'farms' => [[
                        'id',
                        'name',
                        'address',
                        'brand_story',
                        'farming_philosophy',
                        'images',
                        'quality_tests' => [[
                            'id',
                            'sample_type',
                            'inspected_at',
                            'result',
                            'file_path',
                            'file_url',
                            'note',
                        ]],
                    ]],
                    'cultivation_process' => [[
                        'farm_id',
                        'farm_name',
                        'description',
                    ]],
                    'certifications' => [],
                    'certification_details' => [[
                        'id',
                        'farm_id',
                        'name',
                        'standard',
                        'issuer',
                        'issued_date',
                        'expiry_date',
                        'product_name',
                        'file_path',
                        'file_url',
                    ]],
                ],
                'meta',
                'errors',
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.farms.0.name', 'Nông Trại Xanh Củ Chi')
            ->assertJsonPath('data.cultivation_process.0.description', 'Canh tác 6 không: Không thuốc trừ sâu hóa học, không phân bón vô cơ, không chất kích thích tăng trưởng, không biến đổi gen, không chất bảo quản, không thuốc diệt cỏ.')
            ->assertJsonPath('data.certification_details.0.file_path', '/uploads/certs/huu_co_xa_lach.pdf')
            ->assertJsonCount(2, 'data.certifications')
            ->assertJsonMissing(['name' => 'Chứng nhận VietGAP đã hết hạn'])
            ->assertJsonMissing(['standard' => 'GlobalGAP']);
    }

    public function test_brand_story_returns_latest_database_content_and_farm_inspections(): void
    {
        DB::table('nong_trai')
            ->where('Ma_nong_trai', 1)
            ->update([
                'Cau_chuyen_thuong_hieu' => 'Câu chuyện thương hiệu vừa cập nhật.',
                'Triet_ly_canh_tac' => 'Triết lý canh tác vừa cập nhật.',
                'Ho_so_nang_luc' => 'Hồ sơ năng lực vừa cập nhật.',
            ]);

        $inspectionId = DB::table('ket_qua_kiem_dinh')->insertGetId([
            'Ma_nong_trai' => 1,
            'Loai_mau' => 'Dat',
            'Ngay_kiem_dinh' => now()->toDateString(),
            'Ket_qua' => 'Kết quả kiểm định mới nhất.',
            'Tep_scan' => '/uploads/labs/kiem_dinh_moi.pdf',
            'Ghi_chu' => 'Hồ sơ vừa được bổ sung.',
        ]);

        $this->getJson('/api/brand-story')
            ->assertOk()
            ->assertJsonPath('data.farms.0.brand_story', 'Câu chuyện thương hiệu vừa cập nhật.')
            ->assertJsonPath('data.farms.0.farming_philosophy', 'Triết lý canh tác vừa cập nhật.')
            ->assertJsonPath('data.farms.0.capacity_profile', 'Hồ sơ năng lực vừa cập nhật.')
            ->assertJsonPath('data.cultivation_process.0.description', 'Triết lý canh tác vừa cập nhật.')
            ->assertJsonPath('data.farms.0.quality_tests.0.id', $inspectionId)
            ->assertJsonPath('data.farms.0.quality_tests.0.result', 'Kết quả kiểm định mới nhất.')
            ->assertJsonPath('data.farms.0.quality_tests.0.file_path', '/uploads/labs/kiem_dinh_moi.pdf');
    }
}
