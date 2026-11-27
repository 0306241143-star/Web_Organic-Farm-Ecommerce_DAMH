<?php

namespace Tests\Feature;

use App\Models\NguoiDung;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
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

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();
        parent::tearDown();
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

    public function test_recurring_order_command_runs_only_for_active_subscription_schedules(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::create(2026, 11, 17, 6, 0, 0));

        Artisan::call('subscriptions:generate-orders');
        Artisan::call('subscriptions:generate-orders');

        $this->assertSame(
            1,
            DB::table('don_hang')
                ->where('Ma_dang_ky_goi', 1)
                ->where('Loai_don', 'Dinh_ky')
                ->whereDate('Ngay_dat', '2026-11-17')
                ->count()
        );
        $this->assertDatabaseHas('don_hang', [
            'Ma_dang_ky_goi' => 1,
            'Loai_don' => 'Dinh_ky',
            'Trang_thai' => 'Cho_xac_nhan',
        ]);

        CarbonImmutable::setTestNow();
    }

    public function test_recurring_shortage_is_visible_to_sales_without_creating_a_new_table(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::create(2026, 11, 17, 6, 0, 0));
        $this->setProductStock(2, 0);

        Artisan::call('subscriptions:generate-orders');

        $order = DB::table('don_hang')
            ->where('Ma_dang_ky_goi', 1)
            ->whereDate('Ngay_dat', '2026-11-17')
            ->first();
        $this->assertNotNull($order);
        $this->assertSame('Cho_xac_nhan', $order->Trang_thai);
        $this->assertSame(0, DB::table('phan_bo_lo_hang')
            ->join('chi_tiet_don_hang', 'chi_tiet_don_hang.Ma_ct_don_hang', '=', 'phan_bo_lo_hang.Ma_ct_don_hang')
            ->where('chi_tiet_don_hang.Ma_don_hang', $order->Ma_don_hang)
            ->count());
        $this->assertFalse(Schema::hasTable('canh_bao_thieu_hang'));

        $this->actingAs(NguoiDung::query()->findOrFail(2), 'sanctum')
            ->getJson('/api/sales/recurring-stock-alerts')
            ->assertOk()
            ->assertJsonPath('data.0.order_id', (int) $order->Ma_don_hang)
            ->assertJsonPath('data.0.stock_alert.items.0.product_id', 2)
            ->assertJsonPath('data.0.stock_alert.items.0.missing_quantity', 1);

        $this->setProductStock(2, 10);
        $this->setProductExpiry(3, '2026-12-30');
        Artisan::call('subscriptions:generate-orders');
        $this->assertSame(1.0, (float) DB::table('phan_bo_lo_hang')
            ->join('chi_tiet_don_hang', 'chi_tiet_don_hang.Ma_ct_don_hang', '=', 'phan_bo_lo_hang.Ma_ct_don_hang')
            ->where('chi_tiet_don_hang.Ma_don_hang', $order->Ma_don_hang)
            ->where('chi_tiet_don_hang.Ma_san_pham', 2)
            ->sum('phan_bo_lo_hang.So_luong_xuat'));

        CarbonImmutable::setTestNow();
    }

    public function test_sales_can_replace_a_shortage_and_postpone_using_existing_order_note(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::create(2026, 11, 17, 6, 0, 0));
        $this->setProductStock(2, 0);
        $this->setProductExpiry(5, '2026-12-30');

        Artisan::call('subscriptions:generate-orders');
        $order = DB::table('don_hang')
            ->where('Ma_dang_ky_goi', 1)
            ->whereDate('Ngay_dat', '2026-11-17')
            ->first();
        $detailId = DB::table('chi_tiet_don_hang')
            ->where('Ma_don_hang', $order->Ma_don_hang)
            ->where('Ma_san_pham', 2)
            ->value('Ma_ct_don_hang');
        $sales = NguoiDung::query()->findOrFail(2);

        $this->actingAs($sales, 'sanctum')
            ->getJson("/api/sales/orders/{$order->Ma_don_hang}/stock-alert/replacements/{$detailId}")
            ->assertOk()
            ->assertJsonFragment(['product_id' => 5]);

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$order->Ma_don_hang}/stock-alert/replace", [
                'detail_id' => $detailId,
                'product_id' => 5,
            ])
            ->assertOk()
            ->assertJsonPath('data.resolved', true);

        $this->assertDatabaseHas('chi_tiet_don_hang', [
            'Ma_ct_don_hang' => $detailId,
            'Ma_san_pham' => 5,
        ]);
        $this->assertSame(1.0, (float) DB::table('phan_bo_lo_hang')
            ->where('Ma_ct_don_hang', $detailId)
            ->sum('So_luong_xuat'));

        $this->setProductStock(2, 0);
        $this->setProductStock(5, 0);
        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$order->Ma_don_hang}/stock-alert/postpone")
            ->assertOk()
            ->assertJsonPath('data.scheduled_delivery_at', '2026-11-24');
        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$order->Ma_don_hang}/confirm")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['order_id']);

        $this->assertStringContainsString(
            '[[RECURRING_DELIVERY:2026-11-24]]',
            DB::table('don_hang')->where('Ma_don_hang', $order->Ma_don_hang)->value('Ghi_chu')
        );

        CarbonImmutable::setTestNow();
    }

    public function test_postponed_order_retries_when_due_and_does_not_duplicate_the_delivery(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::create(2026, 11, 17, 6, 0, 0));
        $this->setProductStock(2, 0);
        $this->setProductExpiry(3, '2026-12-30');

        Artisan::call('subscriptions:generate-orders');
        $order = DB::table('don_hang')
            ->where('Ma_dang_ky_goi', 1)
            ->whereDate('Ngay_dat', '2026-11-17')
            ->first();
        $sales = NguoiDung::query()->findOrFail(2);

        $this->actingAs($sales, 'sanctum')
            ->postJson("/api/sales/orders/{$order->Ma_don_hang}/stock-alert/postpone")
            ->assertOk()
            ->assertJsonPath('data.scheduled_delivery_at', '2026-11-24');

        $this->setProductStock(2, 10);
        CarbonImmutable::setTestNow(CarbonImmutable::create(2026, 11, 24, 6, 0, 0));
        Artisan::call('subscriptions:generate-orders');
        Artisan::call('subscriptions:generate-orders');

        $this->assertSame(1, DB::table('don_hang')
            ->where('Ma_dang_ky_goi', 1)
            ->whereDate('Ngay_dat', '2026-11-17')
            ->count());
        $this->assertSame(1.0, (float) DB::table('phan_bo_lo_hang')
            ->join('chi_tiet_don_hang', 'chi_tiet_don_hang.Ma_ct_don_hang', '=', 'phan_bo_lo_hang.Ma_ct_don_hang')
            ->where('chi_tiet_don_hang.Ma_don_hang', $order->Ma_don_hang)
            ->where('chi_tiet_don_hang.Ma_san_pham', 2)
            ->sum('phan_bo_lo_hang.So_luong_xuat'));
        $this->assertSame(0, DB::table('don_hang')
            ->where('Ma_dang_ky_goi', 1)
            ->whereDate('Ngay_dat', '2026-11-24')
            ->count());

        $customer = NguoiDung::query()->findOrFail(5);
        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/customer/orders/{$order->Ma_don_hang}")
            ->assertOk()
            ->assertJsonPath('data.scheduled_delivery_at', '2026-11-24')
            ->assertJsonPath('data.note', 'Đơn tự động sinh từ gói định kỳ • Khung giờ nhận: 08:00 - 10:00');

        CarbonImmutable::setTestNow();
    }

    private function setProductStock(int $productId, float $quantity): void
    {
        DB::table('lo_hang')
            ->whereIn('Ma_lo_canh_tac', function ($query) use ($productId): void {
                $query->select('Ma_lo_canh_tac')
                    ->from('lo_canh_tac')
                    ->where('Ma_san_pham', $productId);
            })
            ->update([
                'So_luong_con_lai' => $quantity,
                'Trang_thai' => $quantity > 0 ? 'Con_hang' : 'Het_hang',
                'Han_su_dung' => '2026-12-30',
            ]);
    }

    private function setProductExpiry(int $productId, string $expiryDate): void
    {
        DB::table('lo_hang')
            ->whereIn('Ma_lo_canh_tac', function ($query) use ($productId): void {
                $query->select('Ma_lo_canh_tac')
                    ->from('lo_canh_tac')
                    ->where('Ma_san_pham', $productId);
            })
            ->update(['Han_su_dung' => $expiryDate]);
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
