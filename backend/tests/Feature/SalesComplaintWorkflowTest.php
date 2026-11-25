<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SalesComplaintWorkflowTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_sales_can_list_and_view_complaints_with_image_and_video_evidence(): void
    {
        $this->actingAs($this->salesUser(), 'sanctum')
            ->getJson('/api/sales/claims')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.counts.Da_giai_quyet', 2)
            ->assertJsonPath('data.claims.0.claim_id', 2);

        $this->actingAs($this->salesUser(), 'sanctum')
            ->getJson('/api/sales/claims/1')
            ->assertOk()
            ->assertJsonPath('data.order.order_id', 2)
            ->assertJsonPath('data.customer.name', NguoiDung::query()->findOrFail(5)->Ho_ten)
            ->assertJsonPath('data.evidence.0.type', 'image')
            ->assertJsonPath('data.evidence.1.type', 'video')
            ->assertJsonPath('data.replacement_order_id', 4);
    }

    public function test_sales_can_receive_a_waiting_complaint_once(): void
    {
        $claimId = $this->createClaimFixture(1)['claim_id'];

        $this->actingAs($this->salesUser(), 'sanctum')
            ->patchJson("/api/sales/claims/{$claimId}/receive")
            ->assertOk()
            ->assertJsonPath('data.status', 'Dang_xu_ly');

        $this->assertDatabaseHas('khieu_nai', [
            'Ma_khieu_nai' => $claimId,
            'Trang_thai' => 'Dang_xu_ly',
            'Ma_nhan_vien_xu_ly' => $this->salesUser()->Ma_nguoi_dung,
        ]);
        $this->assertNotNull(DB::table('khieu_nai')->where('Ma_khieu_nai', $claimId)->value('Ngay_tiep_nhan'));

        $this->actingAs($this->salesUser(), 'sanctum')
            ->patchJson("/api/sales/claims/{$claimId}/receive")
            ->assertUnprocessable();
    }

    public function test_sales_can_approve_a_partial_refund_without_claiming_money_was_paid(): void
    {
        $fixture = $this->createClaimFixture(1);
        $this->createSuccessfulPayment($fixture['order_id'], 100000);
        $sales = $this->salesUser();

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/claims/{$fixture['claim_id']}/resolve", [
                'ket_qua' => 'chap_nhan',
                'phuong_an_xu_ly' => 'hoan_tien',
                'so_tien_hoan' => 25000,
                'phan_hoi_cskh' => 'XanhFarm xin lỗi và đã duyệt khoản hoàn tiền cho Quý khách.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Da_giai_quyet')
            ->assertJsonPath('data.resolution', 'Hoan_tien')
            ->assertJsonPath('data.refund_status', 'Cho_xu_ly')
            ->assertJsonPath('data.refund_amount', 25000);

        $this->assertDatabaseHas('khieu_nai', [
            'Ma_khieu_nai' => $fixture['claim_id'],
            'Hinh_thuc_xu_ly' => 'Hoan_tien',
            'So_tien_hoan' => 25000,
            'Phan_hoi_cskh' => 'XanhFarm xin lỗi và đã duyệt khoản hoàn tiền cho Quý khách.',
            'Ma_nhan_vien_xu_ly' => $sales->Ma_nguoi_dung,
        ]);
        $this->assertDatabaseHas('hoan_tien', [
            'Ma_khieu_nai' => $fixture['claim_id'],
            'So_tien' => 25000,
            'Trang_thai' => 'Cho_xu_ly',
        ]);
        $this->assertDatabaseHas('thanh_toan', [
            'Ma_don_hang' => $fixture['order_id'],
            'Trang_thai' => 'Thanh_cong',
        ]);

        $this->actingAs($sales, 'sanctum')
            ->getJson("/api/sales/orders/{$fixture['order_id']}")
            ->assertOk()
            ->assertJsonPath('data.complaint_history.0.refund_amount', 25000)
            ->assertJsonPath('data.complaint_history.0.refund_status', 'Cho_xu_ly');
    }

    public function test_sales_can_create_a_free_fefo_replacement_order_for_a_complaint(): void
    {
        $fixture = $this->createClaimFixture(2);
        $before = (float) DB::table('lo_hang')
            ->where('Ma_lo_hang', $fixture['batch_id'])
            ->value('So_luong_con_lai');

        $this->actingAs($this->salesUser(), 'sanctum')
            ->postJson("/api/sales/claims/{$fixture['claim_id']}/resolve", [
                'ket_qua' => 'chap_nhan',
                'phuong_an_xu_ly' => 'giao_bu',
                'phan_hoi_cskh' => 'Chúng tôi xin lỗi và sẽ gửi sản phẩm thay thế miễn phí.',
                'items' => [[
                    'chi_tiet_don_hang_id' => $fixture['detail_id'],
                    'so_luong_bu' => 2,
                ]],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'Da_giai_quyet')
            ->assertJsonPath('data.resolution', 'Giao_bu')
            ->assertJsonPath('data.replacement_order.order_type', 'Giao_bu')
            ->assertJsonPath('data.replacement_order.total', 0);

        $replacementId = (int) DB::table('khieu_nai')
            ->where('Ma_khieu_nai', $fixture['claim_id'])
            ->value('Ma_don_giao_bu');

        $this->assertGreaterThan(0, $replacementId);
        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => $replacementId,
            'Ma_don_goc' => $fixture['order_id'],
            'Ma_khieu_nai' => $fixture['claim_id'],
            'Loai_don' => 'Giao_bu',
            'Trang_thai' => 'Da_xac_nhan',
            'Tong_tien' => 0,
            'Ma_dia_chi' => 1,
        ]);
        $this->assertDatabaseHas('chi_tiet_don_hang', [
            'Ma_don_hang' => $replacementId,
            'Ma_san_pham' => $fixture['product_id'],
            'So_luong' => 2,
            'Don_gia' => 0,
            'Thanh_tien' => 0,
        ]);
        $this->assertDatabaseHas('thanh_toan', [
            'Ma_don_hang' => $replacementId,
            'Phuong_thuc' => 'Giao_bu',
            'Trang_thai' => 'Thanh_cong',
            'So_tien' => 0,
        ]);
        $this->assertSame(
            $before - 2,
            (float) DB::table('lo_hang')->where('Ma_lo_hang', $fixture['batch_id'])->value('So_luong_con_lai')
        );

        $this->actingAs($this->salesUser(), 'sanctum')
            ->getJson("/api/sales/orders/{$replacementId}")
            ->assertOk()
            ->assertJsonPath('data.original_order_id', $fixture['order_id'])
            ->assertJsonPath('data.complaint_history.0.claim_id', $fixture['claim_id']);
    }

    private function createClaimFixture(float $quantity): array
    {
        $productId = DB::table('san_pham')->insertGetId([
            'Ma_danh_muc' => 1,
            'Ma_nong_trai' => 1,
            'Ten_san_pham' => 'Sản phẩm kiểm thử khiếu nại',
            'Mo_ta' => 'Sản phẩm dùng cho kiểm thử quy trình khiếu nại.',
            'Don_vi_tinh' => 'kg',
            'Gia_ban' => 50000,
            'Ty_le_tich_diem' => 1,
            'Trang_thai' => 'Dang_ban',
        ], 'Ma_san_pham');

        $plotId = DB::table('lo_canh_tac')->insertGetId([
            'Ma_mua_vu' => 1,
            'Ma_san_pham' => $productId,
            'Ten_lo' => 'Lô kiểm thử khiếu nại',
            'Ngay_gieo_trong' => now()->subDays(10)->toDateString(),
            'Trang_thai' => 'Dang_canh_tac',
        ], 'Ma_lo_canh_tac');

        $batchId = DB::table('lo_hang')->insertGetId([
            'Ma_lo_canh_tac' => $plotId,
            'Ma_nhan_vien_phu_trach' => 3,
            'Ngay_thu_hoach' => now()->toDateString(),
            'Han_su_dung' => now()->addDays(30)->toDateString(),
            'So_luong_thu_hoach' => 20,
            'So_luong_con_lai' => 20,
            'Trang_thai' => 'Con_hang',
        ], 'Ma_lo_hang');

        $orderId = DB::table('don_hang')->insertGetId([
            'Ma_nguoi_dung' => 5,
            'Ma_dia_chi' => 1,
            'Loai_don' => 'Mua_le',
            'Ngay_dat' => now()->subDay(),
            'Tien_hang' => $quantity * 50000,
            'Phi_giao_hang' => 0,
            'Tong_tien' => $quantity * 50000,
            'Trang_thai' => 'Hoan_thanh',
            'created_at' => now()->subDay(),
        ], 'Ma_don_hang');

        $detailId = DB::table('chi_tiet_don_hang')->insertGetId([
            'Ma_don_hang' => $orderId,
            'Ma_san_pham' => $productId,
            'So_luong' => $quantity,
            'Don_gia' => 50000,
            'Thanh_tien' => $quantity * 50000,
        ], 'Ma_ct_don_hang');

        $claimId = DB::table('khieu_nai')->insertGetId([
            'Ma_don_hang' => $orderId,
            'Ma_nguoi_dung' => 5,
            'Ly_do' => 'Sản phẩm bị hư hỏng',
            'Mo_ta_chi_tiet' => 'Sản phẩm bị hư hỏng khi khách hàng nhận hàng.',
            'Hinh_thuc_xu_ly' => 'Chua_xac_dinh',
            'Trang_thai' => 'Cho_xu_ly',
            'created_at' => now(),
        ], 'Ma_khieu_nai');
        DB::table('don_hang')->where('Ma_don_hang', $orderId)->update(['Ma_khieu_nai' => $claimId]);

        return [
            'claim_id' => (int) $claimId,
            'order_id' => (int) $orderId,
            'detail_id' => (int) $detailId,
            'product_id' => (int) $productId,
            'batch_id' => (int) $batchId,
        ];
    }

    private function createSuccessfulPayment(int $orderId, float $amount): void
    {
        DB::table('thanh_toan')->insert([
            'Ma_don_hang' => $orderId,
            'Phuong_thuc' => 'ApiPay',
            'So_tien' => $amount,
            'Trang_thai' => 'Thanh_cong',
            'Thoi_gian_thanh_toan' => now(),
        ]);
    }

    private function salesUser(): NguoiDung
    {
        return NguoiDung::query()->where('Ma_vai_tro', 2)->firstOrFail();
    }
}
