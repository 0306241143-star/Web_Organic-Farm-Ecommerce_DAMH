<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CustomerOrderManagementTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_customer_can_list_and_view_only_their_own_orders(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/orders')
            ->assertOk()
            ->assertJsonPath('data.0.order_type', 'Giao_bu')
            ->assertJsonPath('data.0.items.0.name', 'Cà chua Beef hữu cơ')
            ->assertJsonStructure(['meta' => ['current_page', 'per_page', 'total', 'last_page']]);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/orders/1')
            ->assertOk()
            ->assertJsonPath('data.order_id', 1)
            ->assertJsonPath('data.address.recipient_name', 'Đặng Ngọc Anh')
            ->assertJsonPath('data.payments.0.status', 'Thanh_cong');

        $this->actingAs(NguoiDung::query()->findOrFail(6), 'sanctum')
            ->getJson('/api/customer/orders/1')
            ->assertNotFound();
    }

    public function test_customer_can_pause_and_resume_owned_subscription_and_its_schedule(): void
    {
        DB::table('dang_ky_goi')->where('Ma_dang_ky', 1)->update([
            'Ngay_ket_thuc' => now()->addDays(5)->toDateString(),
        ]);
        $customer = NguoiDung::query()->findOrFail(5);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/subscriptions')
            ->assertOk()
            ->assertJsonPath('data.0.package.name', 'Gói Rau Củ Gia Đình 3kg (Giao 2 lần/tuần)')
            ->assertJsonPath('data.0.deliveries.0.order_id', 3);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions/1/pause')
            ->assertOk()
            ->assertJsonPath('data.status', 'Tam_dung');
        $this->assertDatabaseHas('lich_giao_dinh_ky', [
            'Ma_dang_ky' => 1,
            'Trang_thai' => 'Tam_ngung',
        ]);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions/1/resume')
            ->assertOk()
            ->assertJsonPath('data.status', 'Dang_hoat_dong');
        $this->assertDatabaseHas('lich_giao_dinh_ky', [
            'Ma_dang_ky' => 1,
            'Trang_thai' => 'Hoat_dong',
        ]);

        $this->actingAs(NguoiDung::query()->findOrFail(6), 'sanctum')
            ->postJson('/api/customer/subscriptions/1/pause')
            ->assertNotFound();
    }

    public function test_cancelling_pending_order_refunds_points_and_restores_allocated_stock_once(): void
    {
        $orderId = DB::table('don_hang')->insertGetId([
            'Ma_nguoi_dung' => 5,
            'Ma_dia_chi' => 1,
            'Loai_don' => 'Mua_le',
            'Ngay_dat' => now(),
            'Tien_hang' => 70000,
            'Tong_tien' => 70000,
            'So_diem_su_dung' => 5,
            'Trang_thai' => 'Cho_xac_nhan',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $detailId = DB::table('chi_tiet_don_hang')->insertGetId([
            'Ma_don_hang' => $orderId,
            'Ma_san_pham' => 1,
            'So_luong' => 2,
            'Don_gia' => 35000,
            'Thanh_tien' => 70000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('phan_bo_lo_hang')->insert([
            'Ma_ct_don_hang' => $detailId,
            'Ma_lo_hang' => 2,
            'So_luong_xuat' => 2,
            'Ngay_xuat_kho' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('diem_tich_luy')->insert([
            'Ma_nguoi_dung' => 5,
            'Ma_don_hang' => $orderId,
            'Loai_giao_dich' => 'Su_dung',
            'So_diem' => -5,
            'Mo_ta' => 'Dùng điểm cho đơn kiểm thử',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $initialStock = (float) DB::table('lo_hang')->where('Ma_lo_hang', 2)->value('So_luong_con_lai');
        $customer = NguoiDung::query()->findOrFail(5);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/customer/checkout/orders/{$orderId}/cancel")
            ->assertOk()
            ->assertJsonPath('data.points_refunded', 5)
            ->assertJsonPath('data.stock_restored', 2);

        $this->assertSame(
            $initialStock + 2,
            (float) DB::table('lo_hang')->where('Ma_lo_hang', 2)->value('So_luong_con_lai')
        );
        $this->assertDatabaseHas('diem_tich_luy', [
            'Ma_don_hang' => $orderId,
            'Loai_giao_dich' => 'Hoan_diem',
            'So_diem' => 5,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/customer/checkout/orders/{$orderId}/cancel")
            ->assertOk()
            ->assertJsonPath('data.points_refunded', 0)
            ->assertJsonPath('data.stock_restored', 0);
        $this->assertSame(
            $initialStock + 2,
            (float) DB::table('lo_hang')->where('Ma_lo_hang', 2)->value('So_luong_con_lai')
        );
        $this->assertSame(
            1,
            DB::table('diem_tich_luy')
                ->where('Ma_don_hang', $orderId)
                ->where('Loai_giao_dich', 'Hoan_diem')
                ->count()
        );
    }

    public function test_customer_cannot_cancel_a_completed_or_paid_order(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/checkout/orders/1/cancel')
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['order_id']);

        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => 1,
            'Trang_thai' => 'Hoan_thanh',
        ]);
    }

    public function test_reward_wallet_uses_configured_conversion_rate_and_paginates_history(): void
    {
        DB::table('cau_hinh_he_thong')->updateOrInsert(
            ['Khoa' => 'diem_quy_doi_vnd'],
            ['Gia_tri' => '500']
        );

        $this->actingAs(NguoiDung::query()->findOrFail(5), 'sanctum')
            ->getJson('/api/customer/rewards?per_page=2')
            ->assertOk()
            ->assertJsonPath('data.conversion_rules.point_to_vnd', 500)
            ->assertJsonCount(2, 'data.history')
            ->assertJsonPath('meta.history.per_page', 2);
    }
}
