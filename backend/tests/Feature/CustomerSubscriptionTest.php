<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class CustomerSubscriptionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', ['--seed' => true]);
        config([
            'services.apipay.access_key' => 'test-access-key',
            'services.apipay.secret_key' => 'test-secret-key',
            'services.apipay.bank_public_id' => 'test-bank',
            'services.apipay.webhook_secret' => 'subscription-test-webhook-secret',
        ]);
        Http::fake([
            'app.apipay.vn/v1/client/payment-requests' => Http::response([
                'data' => [
                    'publicId' => 'subscription-payment-test',
                    'payUrl' => 'https://pay.apipay.vn/subscription-test',
                    'qrUrl' => 'https://app.apipay.vn/qr/subscription-test',
                    'status' => 'ACTIVE',
                    'expiresAt' => '2026-11-20T22:00:00+07:00',
                ],
            ]),
            'app.apipay.vn/v1/client/payment-requests/*' => Http::response([
                'data' => [
                    'status' => 'ACTIVE',
                    'payUrl' => 'https://pay.apipay.vn/subscription-test',
                    'qrUrl' => 'https://app.apipay.vn/qr/subscription-test',
                ],
            ]),
        ]);
    }

    public function test_customer_can_create_an_idempotent_subscription_with_weekly_delivery_days(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);
        $payload = $this->validPayload();

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $payload)
            ->assertCreated()
            ->assertJsonPath('data.status', 'Cho_thanh_toan');

        $subscriptionId = $response->json('data.subscription_id');
        $durationMonths = (int) DB::table('goi_dinh_ky')
            ->where('Ma_goi', $payload['package_id'])
            ->value('Ky_han_thang');
        $expectedEndDate = CarbonImmutable::createFromFormat('!Y-m-d', $payload['start_date'])
            ->addMonthsNoOverflow($durationMonths)
            ->subDay()
            ->toDateString();

        $this->assertSame($expectedEndDate, $response->json('data.end_date'));
        $this->assertDatabaseHas('dang_ky_goi', [
            'Ma_dang_ky' => $subscriptionId,
            'Ma_nguoi_dung' => 5,
            'Ma_goi' => $payload['package_id'],
            'Ma_dia_chi' => $payload['address_id'],
            'Trang_thai' => 'Cho_thanh_toan',
        ]);
        $this->assertDatabaseCount('lich_giao_dinh_ky', 4);

        $retry = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $payload)
            ->assertCreated()
            ->assertJsonPath('data.subscription_id', $subscriptionId);

        $this->assertSame($subscriptionId, $retry->json('data.subscription_id'));
        $this->assertDatabaseCount('dang_ky_goi', 2); // One seeded registration plus this new registration.
        $this->assertDatabaseCount('lich_giao_dinh_ky', 4); // A retry must not duplicate either weekly delivery day.

        $changedPayload = $payload;
        $changedPayload['delivery_days'][0]['delivery_window'] = '15:00 - 17:00';
        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $changedPayload)
            ->assertStatus(409);
    }

    public function test_customer_cannot_register_with_another_users_address_or_invalid_schedule(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);

        $foreignAddressPayload = $this->validPayload();
        $foreignAddressPayload['address_id'] = 3;
        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $foreignAddressPayload)
            ->assertNotFound();

        $invalidSchedulePayload = $this->validPayload();
        $invalidSchedulePayload['delivery_days'][1]['weekday'] = $invalidSchedulePayload['delivery_days'][0]['weekday'];
        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $invalidSchedulePayload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['delivery_days.1.weekday']);

        $this->assertDatabaseCount('dang_ky_goi', 1);
        $this->assertDatabaseCount('lich_giao_dinh_ky', 2);
    }

    public function test_subscription_payment_is_created_for_owner_and_webhook_activates_it_once(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);
        $registrationResponse = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $this->validPayload())
            ->assertCreated();
        $subscriptionId = $registrationResponse->json('data.subscription_id');

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/customer/subscriptions/{$subscriptionId}/checkout")
            ->assertCreated()
            ->assertJsonPath('data.pay_url', 'https://pay.apipay.vn/subscription-test')
            ->assertJsonPath('data.qr_url', 'https://app.apipay.vn/qr/subscription-test');

        $payment = DB::table('thanh_toan')
            ->where('Ma_dang_ky_goi', $subscriptionId)
            ->first();
        $packagePrice = (int) DB::table('goi_dinh_ky')
            ->where('Ma_goi', $registrationResponse->json('data.package_id'))
            ->value('Gia_goi');
        $this->assertSame($packagePrice, (int) $payment->So_tien);

        $otherCustomer = NguoiDung::query()->findOrFail(6);
        $this->actingAs($otherCustomer, 'sanctum')
            ->postJson("/api/customer/subscriptions/{$subscriptionId}/checkout")
            ->assertNotFound();
        $this->actingAs($otherCustomer, 'sanctum')
            ->getJson("/api/customer/subscriptions/{$subscriptionId}")
            ->assertNotFound();

        $webhookBody = $this->webhookBody($payment->Noi_dung_thanh_toan, (string) $packagePrice, 'subscription-transaction-1');
        $this->postWebhook($webhookBody)
            ->assertOk()
            ->assertJsonPath('matched', true);

        $this->assertDatabaseHas('dang_ky_goi', [
            'Ma_dang_ky' => $subscriptionId,
            'Trang_thai' => 'Dang_hoat_dong',
        ]);
        $this->assertDatabaseHas('thanh_toan', [
            'Ma_thanh_toan' => $payment->Ma_thanh_toan,
            'Trang_thai' => 'Thanh_cong',
            'Ma_giao_dich_apipay' => 'subscription-transaction-1',
        ]);

        $this->postWebhook($webhookBody)
            ->assertOk()
            ->assertJsonPath('matched', true);
        $this->assertSame(
            1,
            DB::table('thanh_toan')->where('Ma_giao_dich_apipay', 'subscription-transaction-1')->count()
        );
    }

    public function test_webhook_with_wrong_amount_does_not_activate_subscription(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);
        $registrationResponse = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $this->validPayload())
            ->assertCreated();
        $subscriptionId = $registrationResponse->json('data.subscription_id');
        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/customer/subscriptions/{$subscriptionId}/checkout")
            ->assertCreated();

        $payment = DB::table('thanh_toan')
            ->where('Ma_dang_ky_goi', $subscriptionId)
            ->first();
        $body = $this->webhookBody($payment->Noi_dung_thanh_toan, (string) ((int) $payment->So_tien + 1), 'wrong-amount-transaction');

        $this->postWebhook($body)
            ->assertOk()
            ->assertJsonPath('matched', false);
        $this->assertDatabaseHas('dang_ky_goi', [
            'Ma_dang_ky' => $subscriptionId,
            'Trang_thai' => 'Cho_thanh_toan',
        ]);
        $this->assertDatabaseHas('thanh_toan', [
            'Ma_thanh_toan' => $payment->Ma_thanh_toan,
            'Trang_thai' => 'Khoi_tao',
            'Ma_giao_dich_apipay' => null,
        ]);
    }

    public function test_subscription_routes_require_customer_authentication(): void
    {
        $this->postJson('/api/customer/subscriptions', $this->validPayload())->assertUnauthorized();
        $this->postJson('/api/customer/subscriptions/1/checkout')->assertUnauthorized();
        $this->getJson('/api/customer/subscriptions/1')->assertUnauthorized();
    }

    private function validPayload(): array
    {
        return [
            'package_id' => 1,
            'address_id' => 1,
            'start_date' => now()->addDays(3)->toDateString(),
            'delivery_days' => [
                ['weekday' => 3, 'delivery_window' => '08:00 - 10:00'],
                ['weekday' => 6, 'delivery_window' => '13:00 - 15:00'],
            ],
            'idempotency_key' => (string) Str::uuid(),
        ];
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
                'transactionDate' => now()->toIso8601String(),
            ],
        ], JSON_THROW_ON_ERROR);
    }

    private function postWebhook(string $body)
    {
        return $this->call(
            'POST',
            '/api/webhooks/apipay',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ApiPay_Signature' => hash_hmac(
                    'sha256',
                    $body,
                    'subscription-test-webhook-secret'
                ),
            ],
            $body
        );
    }
}
