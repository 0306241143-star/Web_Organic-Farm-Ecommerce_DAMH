<?php

namespace Tests\Feature;

use App\Models\DiaChiGiaoHang;
use App\Models\GioHang;
use App\Models\NguoiDung;
use App\Services\ShippingDistanceService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CustomerCheckoutTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', ['--seed' => true]);
        config([
            'services.goong.api_key' => 'test-goong-key',
            'services.shipping.price_per_km' => 2000,
            'services.apipay.access_key' => 'test-access-key',
            'services.apipay.secret_key' => 'test-secret-key',
            'services.apipay.bank_public_id' => 'test-bank',
        ]);
        Http::fake([
            'rsapi.goong.io/*' => Http::response([
                'rows' => [[
                    'elements' => [[
                        'status' => 'OK',
                        'distance' => ['value' => 12500],
                    ]],
                ]],
            ]),
            'app.apipay.vn/v1/client/*' => Http::response([
                'data' => [
                    'publicId' => 'payment-request-test-1',
                    'payUrl' => 'https://pay.apipay.vn/test',
                    'qrUrl' => 'https://app.apipay.vn/qr/test',
                    'status' => 'ACTIVE',
                    'expiresAt' => '2026-11-18T22:00:00+07:00',
                ],
            ]),
        ]);
    }

    public function test_customer_can_quote_create_order_and_start_apipay_from_cart(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);
        GioHang::query()
            ->where('Ma_nguoi_dung', 5)
            ->firstOrFail()
            ->chiTiets()
            ->delete();

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/cart/items', [
                'product_id' => 1,
                'quantity' => 2,
            ])
            ->assertOk();

        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/addresses')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $quote = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/checkout/quote', ['address_id' => 1])
            ->assertOk()
            ->assertJsonPath('data.subtotal', 70000)
            ->assertJsonPath('data.distance_km', 12.5)
            ->assertJsonPath('data.shipping_fee', 25000)
            ->assertJsonPath('data.total', 95000);

        $this->assertSame(1, count($quote->json('data.items')));

        $created = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/checkout/orders', [
                'address_id' => 1,
                'note' => 'Gọi trước khi giao',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'Cho_thanh_toan')
            ->assertJsonPath('data.subtotal', 70000)
            ->assertJsonPath('data.distance_km', 12.5)
            ->assertJsonPath('data.shipping_fee', 25000)
            ->assertJsonPath('data.total', 95000);

        $orderId = $created->json('data.order_id');
        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => $orderId,
            'Ma_nguoi_dung' => 5,
            'Ma_dia_chi' => 1,
            'Loai_don' => 'Mua_le',
            'Trang_thai' => 'Cho_thanh_toan',
            'Tong_tien' => 95000,
            'Ghi_chu' => 'Gọi trước khi giao',
        ]);
        $this->assertDatabaseHas('chi_tiet_don_hang', [
            'Ma_don_hang' => $orderId,
            'Ma_san_pham' => 1,
            'So_luong' => 2,
            'Don_gia' => 35000,
            'Thanh_tien' => 70000,
        ]);
        $this->assertDatabaseMissing('chi_tiet_gio_hang', ['Ma_gio_hang' => 1]);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/checkout', ['order_id' => $orderId])
            ->assertCreated()
            ->assertJsonPath('data.pay_url', 'https://pay.apipay.vn/test')
            ->assertJsonPath('data.qr_url', 'https://app.apipay.vn/qr/test');

        config(['services.apipay.webhook_secret' => 'checkout-test-webhook-secret']);
        $paymentContent = DB::table('thanh_toan')
            ->where('Ma_don_hang', $orderId)
            ->value('Noi_dung_thanh_toan');
        $webhookBody = json_encode([
            'event' => 'transaction.in',
            'data' => [
                'transactionId' => 'checkout-transaction-1',
                'content' => $paymentContent,
                'amount' => '95000',
                'type' => 'IN',
                'transactionDate' => '2026-11-18T21:00:00+07:00',
            ],
        ], JSON_THROW_ON_ERROR);

        $this->call(
            'POST',
            '/api/webhooks/apipay',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ApiPay_Signature' => hash_hmac('sha256', $webhookBody, 'checkout-test-webhook-secret'),
            ],
            $webhookBody
        )
            ->assertOk()
            ->assertJsonPath('matched', true);

        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => $orderId,
            'Trang_thai' => 'Cho_xac_nhan',
        ]);
        $this->actingAs($customer, 'sanctum')
            ->getJson("/api/customer/checkout/orders/{$orderId}")
            ->assertOk()
            ->assertJsonPath('data.status', 'Cho_xac_nhan')
            ->assertJsonPath('data.payment_status', 'Thanh_cong');
    }

    public function test_customer_cannot_order_to_another_users_address_or_order_an_empty_cart(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);
        GioHang::query()
            ->where('Ma_nguoi_dung', 5)
            ->firstOrFail()
            ->chiTiets()
            ->delete();

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/checkout/orders', ['address_id' => 3])
            ->assertNotFound();

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/checkout/orders', ['address_id' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['cart']);
    }

    public function test_system_shipping_rate_overrides_the_environment_fallback(): void
    {
        DB::table('cau_hinh_he_thong')->insert([
            'Khoa' => 'don_gia_ship_km',
            'Gia_tri' => '2500',
        ]);

        $estimate = app(ShippingDistanceService::class)
            ->estimate(DiaChiGiaoHang::query()->findOrFail(1));

        $this->assertSame(2500.0, $estimate['price_per_km']);
        $this->assertSame(31250, $estimate['shipping_fee']);
    }
}
