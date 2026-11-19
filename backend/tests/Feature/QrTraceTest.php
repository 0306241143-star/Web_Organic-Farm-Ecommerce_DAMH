<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class QrTraceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_public_qr_trace_returns_batch_logs_and_certifications(): void
    {
        \App\Models\NhatKyCanhTac::query()->create([
            'Ma_lo_canh_tac' => 1,
            'Ma_nhan_vien' => 3,
            'Loai_hoat_dong' => 'Khac',
            'Thoi_gian_thuc_hien' => '2026-11-12 08:00:00',
            'Noi_dung' => 'Nhật ký phát sinh sau ngày thu hoạch của lô.',
        ]);

        $this->getJson('/api/trace/QR-LH20261110-A01')
            ->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'error_code',
                'data' => [
                    'qr_code',
                    'scan_count',
                    'product' => ['id', 'name', 'unit', 'image_url'],
                    'farm' => ['name', 'address'],
                    'season' => ['name', 'start_date', 'end_date'],
                    'plot' => ['name', 'planting_date'],
                    'batch' => ['harvest_date', 'expiry_date', 'is_expired', 'status'],
                    'cultivation_logs' => [[
                        'id',
                        'activity_type',
                        'activity_label',
                        'occurred_at',
                        'content',
                        'media',
                    ]],
                    'certifications' => [[
                        'id',
                        'name',
                        'issuer',
                        'issued_date',
                        'expiry_date',
                        'file_url',
                    ]],
                ],
                'meta',
                'errors',
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.qr_code', 'QR-LH20261110-A01')
            ->assertJsonPath('data.scan_count', 49)
            ->assertJsonPath('data.product.name', 'Xà lách Romaine hữu cơ')
            ->assertJsonPath('data.batch.harvest_date', '2026-11-10')
            ->assertJsonPath('data.batch.is_expired', true)
            ->assertJsonCount(4, 'data.cultivation_logs')
            ->assertJsonCount(1, 'data.certifications')
            ->assertDontSee('Nhật ký phát sinh sau ngày thu hoạch của lô.');
    }

    public function test_unknown_qr_code_returns_standard_not_found_response(): void
    {
        $this->getJson('/api/trace/UNKNOWN-QR')
            ->assertNotFound()
            ->assertJsonStructure([
                'success',
                'message',
                'error_code',
                'data',
                'meta',
                'errors',
            ])
            ->assertJsonPath('success', false)
            ->assertJsonPath('error_code', 'NOT_FOUND');
    }
}
