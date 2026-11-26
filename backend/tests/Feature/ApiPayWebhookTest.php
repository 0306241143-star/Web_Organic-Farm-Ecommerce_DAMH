<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ApiPayWebhookTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--seed' => true]);
        config(['services.apipay.webhook_secret' => 'test-webhook-secret']);
    }

    public function test_it_acknowledges_sandbox_transactions_without_processing_an_order(): void
    {
        $secret = 'test-webhook-secret';
        config(['services.apipay.webhook_secret' => $secret]);

        $body = json_encode([
            'event' => 'transaction.in',
            'sandbox' => true,
            'data' => [
                'transactionId' => 'sandbox-transaction-1',
                'content' => 'DH1XTEST123',
                'amount' => '100000',
                'type' => 'IN',
            ],
        ], JSON_THROW_ON_ERROR);

        $response = $this->call(
            'POST',
            '/api/webhooks/apipay',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ApiPay_Signature' => hash_hmac('sha256', $body, $secret),
            ],
            $body
        );

        $response
            ->assertOk()
            ->assertExactJson(['received' => true, 'sandbox' => true]);
    }

    public function test_it_rejects_a_webhook_with_an_invalid_hmac_signature(): void
    {
        $order = $this->createPendingApiPayOrder();
        $body = $this->webhookBody($order['content'], '100000', 'invalid-signature-transaction');

        $this->postWebhook($body, 'invalid-signature')
            ->assertUnauthorized();

        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => $order['id'],
            'Trang_thai' => 'Cho_thanh_toan',
        ]);
        $this->assertDatabaseHas('thanh_toan', [
            'Ma_don_hang' => $order['id'],
            'Trang_thai' => 'Khoi_tao',
            'Ma_giao_dich_apipay' => null,
        ]);
    }

    public function test_it_does_not_process_a_webhook_when_the_amount_does_not_match(): void
    {
        $order = $this->createPendingApiPayOrder();
        $body = $this->webhookBody($order['content'], '100001', 'wrong-amount-transaction');

        $this->postWebhook($body)
            ->assertOk()
            ->assertJsonPath('matched', false);

        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => $order['id'],
            'Trang_thai' => 'Cho_thanh_toan',
        ]);
        $this->assertDatabaseHas('thanh_toan', [
            'Ma_don_hang' => $order['id'],
            'Trang_thai' => 'Khoi_tao',
            'Ma_giao_dich_apipay' => null,
        ]);
        $this->assertSame(0, DB::table('diem_tich_luy')
            ->where('Ma_don_hang', $order['id'])
            ->where('Loai_giao_dich', 'Tich_diem')
            ->count());
    }

    public function test_replaying_a_successful_webhook_does_not_duplicate_payment_or_reward_points(): void
    {
        $order = $this->createPendingApiPayOrder();
        $body = $this->webhookBody($order['content'], '100000', 'successful-transaction-1');

        $this->postWebhook($body)
            ->assertOk()
            ->assertJsonPath('matched', true);
        $this->postWebhook($body)
            ->assertOk()
            ->assertJsonPath('matched', true);

        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => $order['id'],
            'Trang_thai' => 'Cho_xac_nhan',
        ]);
        $this->assertDatabaseHas('thanh_toan', [
            'Ma_don_hang' => $order['id'],
            'Trang_thai' => 'Thanh_cong',
            'Ma_giao_dich_apipay' => 'successful-transaction-1',
        ]);
        $this->assertSame(1, DB::table('thanh_toan')
            ->where('Ma_giao_dich_apipay', 'successful-transaction-1')
            ->count());
        $this->assertSame(1, DB::table('diem_tich_luy')
            ->where('Ma_don_hang', $order['id'])
            ->where('Loai_giao_dich', 'Tich_diem')
            ->count());
    }

    private function createPendingApiPayOrder(): array
    {
        $customerId = (int) DB::table('nguoi_dung')
            ->where('Ma_vai_tro', 4)
            ->value('Ma_nguoi_dung');
        $addressId = (int) DB::table('dia_chi_giao_hang')
            ->where('Ma_nguoi_dung', $customerId)
            ->value('Ma_dia_chi');
        $this->assertGreaterThan(0, $customerId);
        $this->assertGreaterThan(0, $addressId);

        $orderId = (int) DB::table('don_hang')->insertGetId([
            'Ma_nguoi_dung' => $customerId,
            'Ma_dia_chi' => $addressId,
            'Loai_don' => 'Mua_le',
            'Ngay_dat' => now(),
            'Tien_hang' => 100000,
            'Tong_tien' => 100000,
            'Trang_thai' => 'Cho_thanh_toan',
        ], 'Ma_don_hang');
        $content = sprintf('DH%dXTEST1234', $orderId);

        DB::table('thanh_toan')->insert([
            'Ma_don_hang' => $orderId,
            'Phuong_thuc' => 'ApiPay',
            'So_tien' => 100000,
            'Trang_thai' => 'Khoi_tao',
            'Noi_dung_thanh_toan' => $content,
        ]);

        return ['id' => $orderId, 'content' => $content];
    }

    private function webhookBody(string $content, string $amount, string $transactionId): string
    {
        return json_encode([
            'event' => 'transaction.in',
            'data' => [
                'transactionId' => $transactionId,
                'content' => $content,
                'amount' => $amount,
                'type' => 'IN',
            ],
        ], JSON_THROW_ON_ERROR);
    }

    private function postWebhook(string $body, ?string $signature = null)
    {
        return $this->call(
            'POST',
            '/api/webhooks/apipay',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ApiPay_Signature' => $signature ?? hash_hmac('sha256', $body, 'test-webhook-secret'),
            ],
            $body
        );
    }
}
