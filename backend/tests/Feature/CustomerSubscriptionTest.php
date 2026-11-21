<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\Request as ClientRequest;
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
            'services.apipay.webhook_url' => 'https://example.test/api/webhooks/apipay',
            'services.goong.api_key' => 'test-goong-key',
        ]);
        Http::fake([
            'rsapi.goong.io/Geocode*' => Http::response([
                'results' => [[
                    'geometry' => [
                        'location' => [
                            'lat' => 10.8231,
                            'lng' => 106.6297,
                        ],
                    ],
                ]],
            ]),
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

    public function test_customer_can_enter_a_new_delivery_address_and_retry_without_creating_duplicates(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);
        $payload = $this->validPayload();
        unset($payload['address_id']);
        $payload['shipping_address'] = [
            'recipient_name' => 'Nguyễn Minh An',
            'phone' => '0912345678',
            'street' => '12 Nguyễn Trãi',
            'ward' => 'Phường Bến Thành',
            'province' => 'Thành phố Hồ Chí Minh',
        ];

        $legacyPayload = $payload;
        $legacyPayload['shipping_address']['district'] = 'Quận 1';
        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $legacyPayload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['shipping_address.district']);

        $created = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $payload)
            ->assertCreated();
        $subscriptionId = $created->json('data.subscription_id');
        $addressId = DB::table('dang_ky_goi')
            ->where('Ma_dang_ky', $subscriptionId)
            ->value('Ma_dia_chi');

        $this->assertDatabaseHas('dia_chi_giao_hang', [
            'Ma_dia_chi' => $addressId,
            'Ma_nguoi_dung' => 5,
            'Ten_nguoi_nhan' => 'Nguyễn Minh An',
            'So_dien_thoai_nguoi_nhan' => '0912345678',
            'Dia_chi_chi_tiet' => '12 Nguyễn Trãi',
            'Phuong_xa' => 'Phường Bến Thành',
            'Quan_huyen' => '',
            'Tinh_thanh' => 'Thành phố Hồ Chí Minh',
            'Vi_do' => 10.8231,
            'Kinh_do' => 106.6297,
        ]);
        $this->assertDatabaseCount('dia_chi_giao_hang', 4);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $payload)
            ->assertCreated()
            ->assertJsonPath('data.subscription_id', $subscriptionId);

        $this->assertDatabaseCount('dia_chi_giao_hang', 4);
        $this->assertDatabaseCount('dang_ky_goi', 2);
        Http::assertSentCount(1);
    }

    public function test_new_address_is_rejected_when_goong_geocoding_is_not_configured(): void
    {
        config(['services.goong.api_key' => '']);
        $customer = NguoiDung::query()->findOrFail(5);
        $payload = $this->validPayload();
        unset($payload['address_id']);
        $payload['shipping_address'] = [
            'recipient_name' => 'Nguyễn Minh An',
            'phone' => '0912345678',
            'street' => '12 Nguyễn Trãi',
            'ward' => 'Phường Bến Thành',
            'province' => 'Thành phố Hồ Chí Minh',
        ];

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $payload)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Không thể xác định tọa độ địa chỉ. Vui lòng kiểm tra địa chỉ hoặc liên hệ quản trị viên.');

        $this->assertDatabaseCount('dia_chi_giao_hang', 3);
        $this->assertDatabaseCount('dang_ky_goi', 1);
    }

    public function test_subscription_payment_is_created_for_owner_and_webhook_activates_it_once(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);
        $registrationResponse = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $this->validPayload())
            ->assertCreated();
        $subscriptionId = $registrationResponse->json('data.subscription_id');

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/customer/subscriptions/{$subscriptionId}/checkout", [
                'bank_public_id' => 'attacker-controlled-bank',
            ])
            ->assertCreated()
            ->assertJsonPath('data.pay_url', 'https://pay.apipay.vn/subscription-test')
            ->assertJsonPath('data.qr_url', 'https://app.apipay.vn/qr/subscription-test');

        Http::assertSent(fn (ClientRequest $request): bool => $request->method() === 'POST'
            && str_ends_with($request->url(), '/payment-requests')
            && $request['bankPublicId'] === 'test-bank'
        );

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

    public function test_payment_options_report_when_apipay_configuration_is_incomplete(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/checkout/options')
            ->assertOk()
            ->assertJsonPath('data.bank_configured', true)
            ->assertJsonPath('data.payment_configured', true)
            ->assertJsonPath('data.webhook_configured', true)
            ->assertJsonPath('data.ready', true);

        config(['services.apipay.bank_public_id' => '']);

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/checkout/options')
            ->assertOk()
            ->assertJsonPath('data.bank_configured', false)
            ->assertJsonPath('data.ready', false);
    }

    public function test_subscription_checkout_is_blocked_when_webhook_is_not_configured(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);
        $registration = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/subscriptions', $this->validPayload())
            ->assertCreated();
        $subscriptionId = $registration->json('data.subscription_id');

        config([
            'services.apipay.webhook_secret' => '',
            'services.apipay.webhook_url' => '',
        ]);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/customer/subscriptions/{$subscriptionId}/checkout")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['subscription_id']);

        $this->assertDatabaseMissing('thanh_toan', [
            'Ma_dang_ky_goi' => $subscriptionId,
        ]);
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
