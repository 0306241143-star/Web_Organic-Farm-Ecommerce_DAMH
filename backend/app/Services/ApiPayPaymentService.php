<?php

/*
 * Client gọi API thanh toán ApiPay từ backend.
 */

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class ApiPayPaymentService
{
    public function createPaymentRequest(string $bankPublicId, int $amount, string $content): array
    {
        $response = $this->request('post', 'payment-requests', [
            'bankPublicId' => $bankPublicId,
            'amount' => (string) $amount,
            'content' => $content,
        ]);

        $data = $response['data'] ?? null;
        if (
            ! is_array($data)
            || ! is_string($data['publicId'] ?? null)
            || ! is_string($data['payUrl'] ?? null)
            || ! is_string($data['qrUrl'] ?? null)
            || ! $this->isApiPayUrl($data['payUrl'], 'pay.apipay.vn')
            || ! $this->isApiPayUrl($data['qrUrl'], 'app.apipay.vn')
        ) {
            throw new RuntimeException('ApiPay returned an invalid payment request response.');
        }

        return [
            'public_id' => $data['publicId'],
            'pay_url' => $data['payUrl'],
            'qr_url' => $data['qrUrl'],
            'status' => $data['status'] ?? 'ACTIVE',
            'expires_at' => $data['expiresAt'] ?? null,
        ];
    }

    public function getPaymentRequest(string $publicId): array
    {
        $response = $this->request('get', 'payment-requests/'.rawurlencode($publicId));
        $data = $response['data'] ?? null;

        if (
            ! is_array($data)
            || ! is_string($data['status'] ?? null)
            || (isset($data['payUrl']) && ! $this->isApiPayUrl($data['payUrl'], 'pay.apipay.vn'))
            || (isset($data['qrUrl']) && ! $this->isApiPayUrl($data['qrUrl'], 'app.apipay.vn'))
        ) {
            throw new RuntimeException('ApiPay returned an invalid payment status response.');
        }

        return $data;
    }

    private function request(string $method, string $path, array $payload = []): array
    {
        $accessKey = config('services.apipay.access_key');
        $secretKey = config('services.apipay.secret_key');
        $baseUrl = rtrim((string) config('services.apipay.api_base_url'), '/');

        if (! is_string($accessKey) || $accessKey === '' || ! is_string($secretKey) || $secretKey === '') {
            throw new RuntimeException('ApiPay access key and secret key are not configured.');
        }

        $authorization = base64_encode($accessKey.':'.$secretKey);
        $request = Http::baseUrl($baseUrl)
            ->acceptJson()
            ->withToken($authorization)
            ->timeout(20);

        $response = $method === 'post'
            ? $request->post($path, $payload)
            : $request->get($path);

        if ($response->failed()) {
            throw new RuntimeException('ApiPay request failed with HTTP status '.$response->status().'.');
        }

        $json = $response->json();
        if (! is_array($json)) {
            throw new RuntimeException('ApiPay returned an invalid JSON response.');
        }

        return $json;
    }

    private function isApiPayUrl(string $url, string $host): bool
    {
        $parts = parse_url($url);

        return is_array($parts)
            && ($parts['scheme'] ?? null) === 'https'
            && ($parts['host'] ?? null) === $host;
    }
}
