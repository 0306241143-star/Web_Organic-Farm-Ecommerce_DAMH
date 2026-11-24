<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SalesOrderManagementTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_sales_can_filter_and_paginate_orders_by_status_and_payment_method(): void
    {
        $orderId = $this->createOrder('Cho_xac_nhan', 1);
        DB::table('thanh_toan')->insert([
            'Ma_don_hang' => $orderId,
            'Phuong_thuc' => 'COD',
            'So_tien' => 50000,
            'Trang_thai' => 'Khoi_tao',
        ]);

        $sales = NguoiDung::query()->where('Ma_vai_tro', 2)->firstOrFail();

        $this->actingAs($sales, 'sanctum')
            ->getJson('/api/sales/orders?status=Cho_xac_nhan&payment_method=COD&per_page=1')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 1)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.order_id', $orderId)
            ->assertJsonPath('data.0.customer.name', NguoiDung::query()->findOrFail(5)->Ho_ten)
            ->assertJsonPath('data.0.payments.0.method', 'COD');
    }

    public function test_approval_allocates_only_missing_stock_using_fefo_and_is_idempotent(): void
    {
        $batch = DB::table('lo_hang as batch')
            ->join('lo_canh_tac as plot', 'plot.Ma_lo_canh_tac', '=', 'batch.Ma_lo_canh_tac')
            ->whereIn('batch.Trang_thai', ['Con_hang', 'Sap_het_han'])
            ->where('batch.So_luong_con_lai', '>', 0)
            ->whereDate('batch.Han_su_dung', '>=', now()->toDateString())
            ->orderBy('batch.Han_su_dung')
            ->orderBy('batch.Ma_lo_hang')
            ->first([
                'batch.Ma_lo_hang',
                'batch.Han_su_dung',
                'batch.So_luong_con_lai',
                'plot.Ma_san_pham',
            ]);

        $this->assertNotNull($batch, 'Seed data should contain at least one usable batch.');
        $quantity = 0.25;
        $orderId = $this->createOrder('Cho_xac_nhan', (int) $batch->Ma_san_pham, $quantity);
        DB::table('thanh_toan')->insert([
            'Ma_don_hang' => $orderId,
            'Phuong_thuc' => 'COD',
            'So_tien' => 50000,
            'Trang_thai' => 'Khoi_tao',
        ]);
        $initialAllocationCount = DB::table('phan_bo_lo_hang')->count();
        $initialStock = (float) $batch->So_luong_con_lai;
        $sales = NguoiDung::query()->where('Ma_vai_tro', 2)->firstOrFail();

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$orderId}/confirm")
            ->assertOk()
            ->assertJsonPath('data.status', 'Da_xac_nhan');

        $detailId = DB::table('chi_tiet_don_hang')
            ->where('Ma_don_hang', $orderId)
            ->value('Ma_ct_don_hang');
        $this->assertDatabaseHas('phan_bo_lo_hang', [
            'Ma_ct_don_hang' => $detailId,
            'Ma_lo_hang' => $batch->Ma_lo_hang,
            'So_luong_xuat' => $quantity,
        ]);
        $this->assertSame(
            $initialStock - $quantity,
            (float) DB::table('lo_hang')->where('Ma_lo_hang', $batch->Ma_lo_hang)->value('So_luong_con_lai')
        );

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$orderId}/confirm")
            ->assertOk();

        $this->assertSame($initialAllocationCount + 1, DB::table('phan_bo_lo_hang')->count());
        $this->assertSame(
            $initialStock - $quantity,
            (float) DB::table('lo_hang')->where('Ma_lo_hang', $batch->Ma_lo_hang)->value('So_luong_con_lai')
        );
    }

    public function test_sales_can_confirm_cod_collection_only_once(): void
    {
        $orderId = $this->createOrder('Da_xac_nhan');
        DB::table('thanh_toan')->insert([
            'Ma_don_hang' => $orderId,
            'Phuong_thuc' => 'COD',
            'So_tien' => 50000,
            'Trang_thai' => 'Khoi_tao',
        ]);
        $sales = NguoiDung::query()->where('Ma_vai_tro', 2)->firstOrFail();

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$orderId}/confirm-cod-payment")
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'Thanh_cong');

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$orderId}/confirm-cod-payment")
            ->assertOk();

        $this->assertDatabaseHas('thanh_toan', [
            'Ma_don_hang' => $orderId,
            'Phuong_thuc' => 'COD',
            'Trang_thai' => 'Thanh_cong',
        ]);
        $this->assertSame(
            1,
            DB::table('thanh_toan')->where('Ma_don_hang', $orderId)->where('Phuong_thuc', 'COD')->count()
        );
    }

    private function createOrder(string $status, ?int $productId = null, float $quantity = 1): int
    {
        $orderId = DB::table('don_hang')->insertGetId([
            'Ma_nguoi_dung' => 5,
            'Ma_dia_chi' => 1,
            'Loai_don' => 'Mua_le',
            'Ngay_dat' => now(),
            'Tien_hang' => 50000,
            'Tong_tien' => 50000,
            'Trang_thai' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ], 'Ma_don_hang');

        if ($productId !== null) {
            DB::table('chi_tiet_don_hang')->insert([
                'Ma_don_hang' => $orderId,
                'Ma_san_pham' => $productId,
                'So_luong' => $quantity,
                'Don_gia' => 50000,
                'Thanh_tien' => 50000,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $orderId;
    }
}
