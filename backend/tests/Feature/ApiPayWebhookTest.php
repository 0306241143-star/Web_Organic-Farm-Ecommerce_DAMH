<?php

namespace Tests\Feature;

use Tests\TestCase;

class ApiPayWebhookTest extends TestCase
{
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
}
