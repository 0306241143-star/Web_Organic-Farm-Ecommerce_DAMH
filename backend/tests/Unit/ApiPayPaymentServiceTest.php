<?php

namespace Tests\Unit;

use App\Services\ApiPayPaymentService;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class ApiPayPaymentServiceTest extends TestCase
{
    public function test_it_creates_a_payment_request_using_server_side_credentials(): void
    {
        config([
            'services.apipay.api_base_url' => 'https://app.apipay.vn/v1/client',
            'services.apipay.access_key' => 'sandbox-access',
            'services.apipay.secret_key' => 'sandbox-secret',
        ]);

        Http::fake([
            'https://app.apipay.vn/v1/client/payment-requests' => Http::response([
                'data' => [
                    'publicId' => 'APIPAYTEST123',
                    'payUrl' => 'https://pay.apipay.vn/APIPAYTEST123',
                    'qrUrl' => 'https://app.apipay.vn/v1/payment-requests/APIPAYTEST123/qr-image',
                ],
                'statusCode' => 201,
            ], 201),
        ]);

        $payment = app(ApiPayPaymentService::class)->createPaymentRequest(
            'bank-public-id',
            125000,
            'DH42XABC12345'
        );

        $this->assertSame('APIPAYTEST123', $payment['public_id']);
        $this->assertSame('https://pay.apipay.vn/APIPAYTEST123', $payment['pay_url']);
        Http::assertSent(fn (ClientRequest $request): bool =>
            $request->method() === 'POST'
            && $request->url() === 'https://app.apipay.vn/v1/client/payment-requests'
            && $request->hasHeader(
                'Authorization',
                'Bearer '.base64_encode('sandbox-access:sandbox-secret')
            )
            && $request['amount'] === '125000'
            && $request['content'] === 'DH42XABC12345'
        );
    }

    public function test_it_rejects_payment_urls_outside_apipay_domains(): void
    {
        config([
            'services.apipay.api_base_url' => 'https://app.apipay.vn/v1/client',
            'services.apipay.access_key' => 'sandbox-access',
            'services.apipay.secret_key' => 'sandbox-secret',
        ]);

        Http::fake([
            'https://app.apipay.vn/v1/client/payment-requests' => Http::response([
                'data' => [
                    'publicId' => 'APIPAYTEST123',
                    'payUrl' => 'https://attacker.example/pay',
                    'qrUrl' => 'https://app.apipay.vn/qr',
                ],
            ], 201),
        ]);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('invalid payment request response');

        app(ApiPayPaymentService::class)->createPaymentRequest('bank-public-id', 125000, 'DH42XABC12345');
    }

    public function test_it_requires_credentials_before_making_a_request(): void
    {
        config([
            'services.apipay.access_key' => '',
            'services.apipay.secret_key' => '',
        ]);

        Http::fake();

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('not configured');

        app(ApiPayPaymentService::class)->createPaymentRequest('bank-public-id', 125000, 'DH42XABC12345');
    }
}
