<?php

namespace Tests\Feature;

use App\Models\DiaChiGiaoHang;
use App\Models\GioHang;
use App\Models\NguoiDung;
use App\Models\NongTrai;
use App\Services\ShippingDistanceService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CustomerCheckoutTest extends TestCase
{
    private bool $goongUnavailable = false;

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
            'services.apipay.webhook_secret' => 'checkout-test-webhook-secret',
            'services.apipay.webhook_url' => 'https://example.test/api/webhooks/apipay',
        ]);
        Http::fake(function ($request) {
            if (str_contains($request->url(), 'rsapi.goong.io')) {
                if (str_contains($request->url(), 'Geocode')) {
                    return Http::response([
                        'results' => [[
                            'geometry' => [
                                'location' => [
                                    'lat' => 10.8231,
                                    'lng' => 106.6297,
                                ],
                            ],
                        ]],
                    ]);
                }

                if ($this->goongUnavailable) {
                    return Http::response([], 503);
                }

                return Http::response([
                    'rows' => [[
                        'elements' => [[
                            'status' => 'OK',
                            'distance' => ['value' => 12500],
                        ]],
                    ]],
                ]);
            }

            if (str_contains($request->url(), 'app.apipay.vn/v1/client')) {
                return Http::response([
                    'data' => [
                        'publicId' => 'payment-request-test-1',
                        'payUrl' => 'https://pay.apipay.vn/test',
                        'qrUrl' => 'https://app.apipay.vn/qr/test',
                        'status' => 'ACTIVE',
                        'expiresAt' => '2026-11-18T22:00:00+07:00',
                    ],
                ]);
            }

            return Http::response([], 404);
        });
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

    public function test_customer_can_redeem_points_with_discount_capped_at_merchandise_subtotal_and_get_refund_on_cancel(): void
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
            ->getJson('/api/customer/rewards')
            ->assertOk()
            ->assertJsonPath('data.points_available', 85)
            ->assertJsonPath('data.conversion_rate', 1000);

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/checkout/quote', [
                'address_id' => 1,
                'points_to_use' => 500,
            ])
            ->assertOk()
            ->assertJsonPath('data.points_available', 85)
            ->assertJsonPath('data.points_to_use', 70)
            ->assertJsonPath('data.points_discount', 70000)
            ->assertJsonPath('data.subtotal', 70000)
            ->assertJsonPath('data.shipping_fee', 25000)
            ->assertJsonPath('data.total', 25000);

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/checkout/orders', [
                'address_id' => 1,
                'points_to_use' => 50,
                'payment_method' => 'ApiPay',
            ])
            ->assertCreated()
            ->assertJsonPath('data.points_used', 50)
            ->assertJsonPath('data.points_discount', 50000)
            ->assertJsonPath('data.total', 45000);

        $orderId = $response->json('data.order_id');
        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => $orderId,
            'So_diem_su_dung' => 50,
            'Tien_giam_tu_diem' => 50000,
            'Phi_giao_hang' => 25000,
            'Tong_tien' => 45000,
        ]);
        $this->assertDatabaseHas('diem_tich_luy', [
            'Ma_nguoi_dung' => 5,
            'Ma_don_hang' => $orderId,
            'Loai_giao_dich' => 'Su_dung',
            'So_diem' => -50,
        ]);
        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/rewards')
            ->assertJsonPath('data.points_available', 35);

        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/customer/checkout/orders/{$orderId}/cancel")
            ->assertOk()
            ->assertJsonPath('data.status', 'Da_huy')
            ->assertJsonPath('data.points_refunded', 50);
        $this->actingAs($customer, 'sanctum')
            ->postJson("/api/customer/checkout/orders/{$orderId}/cancel")
            ->assertOk()
            ->assertJsonPath('data.points_refunded', 0);

        $this->assertDatabaseHas('diem_tich_luy', [
            'Ma_nguoi_dung' => 5,
            'Ma_don_hang' => $orderId,
            'Loai_giao_dich' => 'Hoan_diem',
            'So_diem' => 50,
        ]);
        $this->assertSame(
            1,
            DB::table('diem_tich_luy')
                ->where('Ma_don_hang', $orderId)
                ->where('Loai_giao_dich', 'Hoan_diem')
                ->count()
        );
        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/rewards')
            ->assertJsonPath('data.points_available', 85);
    }

    public function test_customer_can_create_and_update_owned_delivery_addresses(): void
    {
        $customer = NguoiDung::query()->findOrFail(5);
        $payload = [
            'recipient_name' => 'Nguyễn Minh An',
            'phone' => '0912345678',
            'street' => '12 Nguyễn Trãi',
            'ward' => 'Phường Bến Thành',
            'district' => 'Quận 1',
            'province' => 'Thành phố Hồ Chí Minh',
        ];

        $created = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/addresses', $payload)
            ->assertCreated()
            ->assertJsonPath('data.recipient_name', 'Nguyễn Minh An')
            ->assertJsonPath('data.phone', '0912345678')
            ->assertJsonPath('data.is_default', false);
        $addressId = $created->json('data.id');

        $this->assertDatabaseHas('dia_chi_giao_hang', [
            'Ma_dia_chi' => $addressId,
            'Ma_nguoi_dung' => 5,
            'Vi_do' => 10.8231,
            'Kinh_do' => 106.6297,
        ]);

        $this->actingAs($customer, 'sanctum')
            ->putJson("/api/customer/addresses/{$addressId}", [
                'recipient_name' => 'Trần Minh An',
                'phone' => '0987654321',
            ])
            ->assertOk()
            ->assertJsonPath('data.recipient_name', 'Trần Minh An')
            ->assertJsonPath('data.phone', '0987654321');

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/addresses', [...$payload, 'phone' => '123'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone']);

        $otherCustomer = NguoiDung::query()->findOrFail(6);
        $this->actingAs($otherCustomer, 'sanctum')
            ->putJson("/api/customer/addresses/{$addressId}", [
                'recipient_name' => 'Không thuộc tài khoản',
            ])
            ->assertNotFound();
    }

    public function test_expired_apipay_order_is_cancelled_and_redeemed_points_are_refunded(): void
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
                'quantity' => 1,
            ])
            ->assertOk();
        $orderResponse = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/checkout/orders', [
                'address_id' => 1,
                'points_to_use' => 10,
                'payment_method' => 'ApiPay',
            ])
            ->assertCreated();
        $orderId = $orderResponse->json('data.order_id');

        $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/checkout', ['order_id' => $orderId])
            ->assertCreated();
        DB::table('don_hang')
            ->where('Ma_don_hang', $orderId)
            ->update(['created_at' => now()->subMinutes(45)]);

        Artisan::call('orders:expire-pending-payments');

        $this->assertDatabaseHas('don_hang', [
            'Ma_don_hang' => $orderId,
            'Trang_thai' => 'Da_huy',
            'So_diem_su_dung' => 10,
        ]);
        $this->assertDatabaseHas('thanh_toan', [
            'Ma_don_hang' => $orderId,
            'Trang_thai' => 'That_bai',
        ]);
        $this->assertDatabaseHas('diem_tich_luy', [
            'Ma_don_hang' => $orderId,
            'Loai_giao_dich' => 'Hoan_diem',
            'So_diem' => 10,
        ]);
        $this->actingAs($customer, 'sanctum')
            ->getJson('/api/customer/rewards')
            ->assertJsonPath('data.points_available', 85);
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

    public function test_customer_can_place_a_cod_order_without_creating_an_apipay_payment(): void
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
                'quantity' => 1,
            ])
            ->assertOk();

        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/customer/checkout/orders', [
                'address_id' => 1,
                'payment_method' => 'COD',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'Cho_xac_nhan');

        $orderId = $response->json('data.order_id');
        $this->assertDatabaseMissing('thanh_toan', ['Ma_don_hang' => $orderId]);
        $this->assertDatabaseMissing('chi_tiet_gio_hang', ['Ma_gio_hang' => 1]);
    }

    public function test_shipping_distance_falls_back_when_goong_is_unconfigured_or_unavailable(): void
    {
        $address = DiaChiGiaoHang::query()->findOrFail(1);
        config(['services.goong.api_key' => '']);

        $fallback = app(ShippingDistanceService::class)->estimate($address);
        $this->assertGreaterThan(1, $fallback['distance_km']);
        $this->assertSame(
            (int) round($fallback['distance_km'] * $fallback['price_per_km']),
            $fallback['shipping_fee']
        );

        config([
            'services.goong.api_key' => 'test-goong-key',
            'services.goong.distance_matrix_url' => 'https://rsapi.goong.io/DistanceMatrix',
        ]);
        $this->goongUnavailable = true;
        $address->refresh();
        $farm = NongTrai::query()->firstOrFail();
        $this->assertIsNumeric($farm->Vi_do);
        $this->assertIsNumeric($farm->Kinh_do);
        $this->assertIsNumeric($address->Vi_do);
        $this->assertIsNumeric($address->Kinh_do);
        $this->assertIsNumeric(DiaChiGiaoHang::query()->findOrFail(1)->Vi_do);
        $failedRequestFallback = app(ShippingDistanceService::class)->estimate($address);
        $this->assertSame($fallback['distance_km'], $failedRequestFallback['distance_km']);
        $this->assertSame($fallback['shipping_fee'], $failedRequestFallback['shipping_fee']);

        $address->Vi_do = null;
        $address->Kinh_do = null;
        config(['services.goong.api_key' => '']);
        $missingCoordinatesFallback = app(ShippingDistanceService::class)->estimate($address);
        $this->assertSame(12.5, $missingCoordinatesFallback['distance_km']);
    }
}
