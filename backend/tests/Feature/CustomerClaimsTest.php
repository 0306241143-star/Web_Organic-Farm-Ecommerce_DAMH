<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CustomerClaimsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_customer_can_list_and_view_only_their_own_claims(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/claims')
            ->assertOk()
            ->assertJsonPath('data.0.claim_id', 2)
            ->assertJsonPath('data.0.order_id', 1)
            ->assertJsonPath('data.0.status', 'Da_giai_quyet')
            ->assertJsonStructure(['meta' => ['current_page', 'per_page', 'total', 'last_page']]);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/claims/1')
            ->assertOk()
            ->assertJsonPath('data.order_id', 2)
            ->assertJsonPath('data.evidence.0.url', '/uploads/complaints/kn1_ca_chua_dap_01.jpg');

        $this->actingAs(NguoiDung::query()->findOrFail(6), 'sanctum')
            ->getJson('/api/customer/claims/1')
            ->assertNotFound();
    }

    public function test_customer_can_submit_a_claim_with_evidence_for_a_completed_order(): void
    {
        $now = Carbon::parse('2026-11-13 09:00:00');
        Carbon::setTestNow($now);
        DB::table('giao_hang')->where('Ma_don_hang', 3)->update([
            'Ngay_giao_thanh_cong' => $now->copy()->subHours(24),
        ]);
        config([
            'filesystems.default_cloud' => 'r2',
            'filesystems.disks.r2.key' => 'test-key',
            'filesystems.disks.r2.secret' => 'test-secret',
            'filesystems.disks.r2.bucket' => 'test-bucket',
            'filesystems.disks.r2.endpoint' => 'https://test.r2.example',
            'filesystems.disks.r2.url' => 'https://cdn.example.test',
        ]);
        Storage::fake('r2');
        $customer = NguoiDung::query()->findOrFail(5);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/orders/3')
            ->assertOk()
            ->assertJsonPath('data.can_claim', true)
            ->assertJsonPath('data.claim_window_expired', false);

        $response = $this->actingAs($customer, 'sanctum')
            ->post('/api/customer/claims', [
                'order_id' => 3,
                'reason' => 'Sản phẩm bị hư hỏng',
                'description' => 'Một sản phẩm trong đơn bị hư hỏng khi nhận hàng.',
                'evidence' => [UploadedFile::fake()->createWithContent(
                    'evidence.png',
                    base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC')
                )],
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.order_id', 3)
            ->assertJsonPath('data.status', 'Cho_xu_ly')
            ->assertJsonPath('data.evidence.0.type', 'Hinh_anh');

        $this->assertDatabaseHas('Khieu_nai', [
            'Ma_don_hang' => 3,
            'Ma_nguoi_dung' => 5,
            'Trang_thai' => 'Cho_xu_ly',
        ]);
        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => 3,
            'Ma_khieu_nai' => $response->json('data.claim_id'),
        ]);

        $file = DB::table('Tep_bang_chung')->where('Ma_khieu_nai', $response->json('data.claim_id'))->first();
        $this->assertNotNull($file);
        $this->assertStringStartsWith('https://cdn.example.test/complaints/', $file->Duong_dan);
        Storage::disk('r2')->assertExists(str_replace('https://cdn.example.test/', '', $file->Duong_dan));
    }

    public function test_customer_can_submit_video_evidence_for_a_completed_order(): void
    {
        $now = Carbon::parse('2026-11-13 09:00:00');
        Carbon::setTestNow($now);
        DB::table('giao_hang')->where('Ma_don_hang', 3)->update([
            'Ngay_giao_thanh_cong' => $now->copy()->subHours(24),
        ]);
        config([
            'filesystems.default_cloud' => 'r2',
            'filesystems.disks.r2.key' => 'test-key',
            'filesystems.disks.r2.secret' => 'test-secret',
            'filesystems.disks.r2.bucket' => 'test-bucket',
            'filesystems.disks.r2.endpoint' => 'https://test.r2.example',
            'filesystems.disks.r2.url' => 'https://cdn.example.test',
        ]);
        Storage::fake('r2');

        $response = $this->actingAs(NguoiDung::query()->findOrFail(5), 'sanctum')
            ->post('/api/customer/claims', [
                'order_id' => 3,
                'reason' => 'Sản phẩm bị hư hỏng',
                'description' => 'Một sản phẩm trong đơn bị hư hỏng khi nhận hàng.',
                'evidence' => [UploadedFile::fake()->create('evidence.mp4', 100, 'video/mp4')],
            ]);

        $response->assertCreated()
            ->assertJsonPath('data.evidence.0.type', 'Video');

        $this->assertDatabaseHas('Tep_bang_chung', [
            'Ma_khieu_nai' => $response->json('data.claim_id'),
            'Loai_tep' => 'Video',
        ]);
    }

    public function test_customer_cannot_upload_unsupported_or_oversized_video_evidence(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);
        $claimData = [
            'order_id' => 3,
            'reason' => 'Sản phẩm bị hư hỏng',
            'description' => 'Một sản phẩm trong đơn bị hư hỏng khi nhận hàng.',
        ];

        $this->actingAs($customer, 'sanctum')
            ->post('/api/customer/claims', $claimData + [
                'evidence' => [UploadedFile::fake()->create('document.pdf', 100, 'application/pdf')],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('evidence.0');

        $this->actingAs($customer, 'sanctum')
            ->post('/api/customer/claims', $claimData + [
                'evidence' => [UploadedFile::fake()->create('large.mp4', 20481, 'video/mp4')],
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('evidence.0');
    }

    public function test_customer_cannot_claim_more_than_24_hours_after_delivery(): void
    {
        $now = Carbon::parse('2026-11-13 09:00:00');
        Carbon::setTestNow($now);
        DB::table('giao_hang')->where('Ma_don_hang', 3)->update([
            'Ngay_giao_thanh_cong' => $now->copy()->subHours(24)->subSecond(),
        ]);
        $customer = NguoiDung::query()->findOrFail(5);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/orders/3')
            ->assertOk()
            ->assertJsonPath('data.can_claim', false)
            ->assertJsonPath('data.claim_window_expired', true);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/claims', [
                'order_id' => 3,
                'reason' => 'Sản phẩm bị hư hỏng',
                'description' => 'Sản phẩm bị hư hỏng khi nhận hàng.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('order_id');

        $this->assertDatabaseMissing('Khieu_nai', ['Ma_don_hang' => 3]);
    }

    public function test_customer_cannot_claim_for_another_customers_or_incomplete_order_or_duplicate(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/claims', [
                'order_id' => 4,
                'reason' => 'Vấn đề khác',
                'description' => 'Đơn hàng chưa hoàn thành.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('order_id');

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/claims', [
                'order_id' => 2,
                'reason' => 'Vấn đề khác',
                'description' => 'Đơn hàng này đã được khiếu nại trước đó.',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('order_id');

        $this->actingAs(NguoiDung::query()->findOrFail(6), 'sanctum')
            ->postJson('/api/customer/claims', [
                'order_id' => 3,
                'reason' => 'Vấn đề khác',
                'description' => 'Không được phép gửi khiếu nại đơn này.',
            ])
            ->assertNotFound();
    }

    public function test_failed_r2_upload_does_not_leave_a_claim_or_update_the_order(): void
    {
        DB::table('giao_hang')->where('Ma_don_hang', 3)->update([
            'Ngay_giao_thanh_cong' => now()->subMinute(),
        ]);
        config([
            'filesystems.default_cloud' => 'r2',
            'filesystems.disks.r2.key' => '',
            'filesystems.disks.r2.secret' => '',
            'filesystems.disks.r2.bucket' => '',
            'filesystems.disks.r2.endpoint' => '',
        ]);
        Storage::fake('r2');

        $this->actingAs(NguoiDung::query()->findOrFail(5), 'sanctum')
            ->post('/api/customer/claims', [
                'order_id' => 3,
                'reason' => 'Sản phẩm bị hư hỏng',
                'description' => 'Một sản phẩm trong đơn bị hư hỏng khi nhận hàng.',
                'evidence' => [UploadedFile::fake()->createWithContent(
                    'evidence.png',
                    base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC')
                )],
            ])
            ->assertInternalServerError();

        $this->assertDatabaseMissing('Khieu_nai', ['Ma_don_hang' => 3]);
        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => 3,
            'Ma_khieu_nai' => null,
        ]);
    }
}
