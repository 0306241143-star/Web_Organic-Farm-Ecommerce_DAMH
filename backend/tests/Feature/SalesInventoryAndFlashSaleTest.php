<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SalesInventoryAndFlashSaleTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_sales_can_read_paginated_fefo_inventory_and_expiry_alerts(): void
    {
        $sales = NguoiDung::query()->where('Ma_vai_tro', 2)->firstOrFail();

        $this->actingAs($sales, 'sanctum')
            ->getJson('/api/sales/inventory?status=ALL&per_page=2')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonCount(2, 'data')
            ->assertJsonStructure([
                'data' => [[
                    'batch_id',
                    'product_name',
                    'expiry_date',
                    'remaining_quantity',
                    'days_until_expiry',
                    'is_expiring_soon',
                ]],
            ]);

        $this->actingAs($sales, 'sanctum')
            ->getJson('/api/sales/expiring-batches?per_page=1')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 1);
    }

    public function test_public_flash_sale_endpoint_ignores_campaigns_outside_their_time_window(): void
    {
        Cache::forget('public_active_flash_sales_v1');

        $this->getJson('/api/flash-sales/active')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_sales_can_create_toggle_and_reenable_a_flash_sale_with_cache_invalidation(): void
    {
        $batch = DB::table('lo_hang as batch')
            ->join('lo_canh_tac as plot', 'plot.Ma_lo_canh_tac', '=', 'batch.Ma_lo_canh_tac')
            ->join('san_pham as product', 'product.Ma_san_pham', '=', 'plot.Ma_san_pham')
            ->whereIn('batch.Trang_thai', ['Con_hang', 'Sap_het_han'])
            ->where('batch.So_luong_con_lai', '>', 0)
            ->whereDate('batch.Han_su_dung', '>=', now()->toDateString())
            ->whereDate('batch.Han_su_dung', '<=', now()->addDays(2)->toDateString())
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('chi_tiet_flash_sale as sale_item')
                    ->join('chuong_trinh_flash_sale as campaign', 'campaign.Ma_flash_sale', '=', 'sale_item.Ma_flash_sale')
                    ->whereColumn('sale_item.Ma_lo_hang', 'batch.Ma_lo_hang')
                    ->where('campaign.Trang_thai', '!=', 'Da_ket_thuc')
                    ->where('campaign.Thoi_gian_bat_dau', '<', now()->addHour())
                    ->where('campaign.Thoi_gian_ket_thuc', '>', now()->subMinute());
            })
            ->orderBy('batch.Han_su_dung')
            ->first([
                'batch.Ma_lo_hang',
                'batch.Han_su_dung',
                'batch.So_luong_con_lai',
                'product.Gia_ban',
            ]);

        $this->assertNotNull($batch, 'Seed data should contain an eligible batch for a new campaign.');
        $sales = NguoiDung::query()->where('Ma_vai_tro', 2)->firstOrFail();
        $start = now()->subMinute()->format('Y-m-d H:i:s');
        $end = now()->addHour()->format('Y-m-d H:i:s');
        $campaignPayload = [
            'title' => 'Flash Sale kiểm thử',
            'start_time' => $start,
            'end_time' => $end,
            'items' => [[
                'batch_id' => (int) $batch->Ma_lo_hang,
                'sale_price' => (float) $batch->Gia_ban * 0.8,
                'limit_quantity' => 0.25,
            ]],
        ];

        Cache::put('public_catalog_products_v2', ['cached' => true], 600);
        Cache::put('public_active_flash_sales_v1', ['cached' => true], 600);

        $createResponse = $this->actingAs($sales, 'sanctum')
            ->postJson('/api/sales/flash-sales', $campaignPayload)
            ->assertCreated()
            ->assertJsonPath('data.status', 'Dang_dien_ra')
            ->assertJsonPath('data.items.0.batch_id', $batch->Ma_lo_hang);

        $campaignId = $createResponse->json('data.campaign_id');
        $this->assertNull(Cache::get('public_catalog_products_v2'));
        $this->assertNull(Cache::get('public_active_flash_sales_v1'));
        $this->getJson('/api/flash-sales/active')
            ->assertOk()
            ->assertJsonPath('data.id', $campaignId);

        Cache::put('public_catalog_products_v2', ['cached' => true], 600);
        Cache::put('public_active_flash_sales_v1', ['cached' => true], 600);
        $this->actingAs($sales, 'sanctum')
            ->patchJson("/api/sales/flash-sales/{$campaignId}/status", ['enabled' => false])
            ->assertOk()
            ->assertJsonPath('data.status', 'Sap_dien_ra');
        $this->assertNull(Cache::get('public_catalog_products_v2'));
        $this->assertNull(Cache::get('public_active_flash_sales_v1'));
        $this->getJson('/api/flash-sales/active')
            ->assertOk()
            ->assertJsonPath('data', null);

        $this->actingAs($sales, 'sanctum')
            ->patchJson("/api/sales/flash-sales/{$campaignId}/status", ['enabled' => true])
            ->assertOk()
            ->assertJsonPath('data.status', 'Dang_dien_ra');
    }

    public function test_flash_sale_rejects_price_at_or_above_regular_price(): void
    {
        $batch = DB::table('lo_hang as batch')
            ->join('lo_canh_tac as plot', 'plot.Ma_lo_canh_tac', '=', 'batch.Ma_lo_canh_tac')
            ->join('san_pham as product', 'product.Ma_san_pham', '=', 'plot.Ma_san_pham')
            ->whereIn('batch.Trang_thai', ['Con_hang', 'Sap_het_han'])
            ->where('batch.So_luong_con_lai', '>', 0)
            ->whereDate('batch.Han_su_dung', '>=', now()->toDateString())
            ->whereDate('batch.Han_su_dung', '<=', now()->addDays(2)->toDateString())
            ->first(['batch.Ma_lo_hang', 'product.Gia_ban']);
        $this->assertNotNull($batch);
        $sales = NguoiDung::query()->where('Ma_vai_tro', 2)->firstOrFail();

        $this->actingAs($sales, 'sanctum')
            ->postJson('/api/sales/flash-sales', [
                'title' => 'Giá không giảm',
                'start_time' => now()->subMinute()->format('Y-m-d H:i:s'),
                'end_time' => now()->addHour()->format('Y-m-d H:i:s'),
                'items' => [[
                    'batch_id' => (int) $batch->Ma_lo_hang,
                    'sale_price' => (float) $batch->Gia_ban,
                    'limit_quantity' => 0.25,
                ]],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items']);
    }

    public function test_flash_sale_only_accepts_batches_near_expiry(): void
    {
        $batch = DB::table('lo_hang as batch')
            ->whereIn('batch.Trang_thai', ['Con_hang', 'Sap_het_han'])
            ->where('batch.So_luong_con_lai', '>', 0)
            ->whereDate('batch.Han_su_dung', '>', now()->addDays(2)->toDateString())
            ->first(['batch.Ma_lo_hang']);
        $this->assertNotNull($batch, 'Seed data should contain an in-stock batch outside the warning window.');
        $sales = NguoiDung::query()->where('Ma_vai_tro', 2)->firstOrFail();

        $this->actingAs($sales, 'sanctum')
            ->postJson('/api/sales/flash-sales', [
                'title' => 'Không cận hạn',
                'start_time' => now()->subMinute()->format('Y-m-d H:i:s'),
                'end_time' => now()->addHour()->format('Y-m-d H:i:s'),
                'items' => [[
                    'batch_id' => (int) $batch->Ma_lo_hang,
                    'sale_price' => 1,
                    'limit_quantity' => 0.25,
                ]],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items']);
    }
}
