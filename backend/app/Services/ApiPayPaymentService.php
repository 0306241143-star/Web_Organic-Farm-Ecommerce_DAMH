<?php

/*
 * Client gọi API thanh toán ApiPay từ backend.
 */

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class ApiPayPaymentService
{
    /**
     * Report whether payment and webhook configuration is complete without exposing credentials.
     *
     * @return array{bank_configured: bool, payment_configured: bool, webhook_configured: bool, ready: bool}
     */
    public function configurationStatus(): array
    {
        // Kiểm tra cấu hình ngân hàng trước để tránh lộ thông tin đăng nhập.
        $bankConfigured = is_string(config('services.apipay.bank_public_id'))
            && config('services.apipay.bank_public_id') !== '';
        $paymentConfigured = $bankConfigured
            && is_string(config('services.apipay.access_key'))
            && config('services.apipay.access_key') !== ''
            && is_string(config('services.apipay.secret_key'))
            && config('services.apipay.secret_key') !== '';
        $webhookConfigured = is_string(config('services.apipay.webhook_secret'))
            && config('services.apipay.webhook_secret') !== ''
            && is_string(config('services.apipay.webhook_url'))
            && config('services.apipay.webhook_url') !== '';

        // Chỉ báo trạng thái sẵn sàng dựa trên cặp khóa thanh toán và webhook.
        return [
            'bank_configured' => $bankConfigured,
            'payment_configured' => $paymentConfigured,
            'webhook_configured' => $webhookConfigured,
            'ready' => $paymentConfigured && $webhookConfigured,
        ];
    }

    public function createPaymentRequest(string $bankPublicId, int $amount, string $content): array
    {
        // Gửi yêu cầu tạo thanh toán sang API của ApiPay.
        $response = $this->request('post', 'payment-requests', [
            'bankPublicId' => $bankPublicId,
            'amount' => (string) $amount,
            'content' => $content,
        ]);

        $data = $response['data'] ?? null;
        // Từ chối phản hồi thiếu mã thanh toán, URL thanh toán hoặc URL QR hợp lệ.
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
        // Truy vấn trạng thái thanh toán bằng mã công khai được sinh trước đó.
        $response = $this->request('get', 'payment-requests/'.rawurlencode($publicId));
        $data = $response['data'] ?? null;

        // Chỉ nhận trạng thái và URL thuộc đúng miền của ApiPay.
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
        // Đọc khóa API phía máy chủ; khóa không được gửi lại cho giao diện.
        $accessKey = config('services.apipay.access_key');
        $secretKey = config('services.apipay.secret_key');
        $baseUrl = rtrim((string) config('services.apipay.api_base_url'), '/');

        if (! is_string($accessKey) || $accessKey === '' || ! is_string($secretKey) || $secretKey === '') {
            throw new RuntimeException('ApiPay access key and secret key are not configured.');
        }

        // ApiPay dùng cặp khóa truy cập trong header xác thực HTTP.
        $authorization = base64_encode($accessKey.':'.$secretKey);
        $request = Http::baseUrl($baseUrl)
            ->acceptJson()
            ->withToken($authorization)
            ->timeout(20);

        // Chọn đúng phương thức HTTP theo hành động gọi API.
        $response = $method === 'post'
            ? $request->post($path, $payload)
            : $request->get($path);

        if ($response->failed()) {
            throw new RuntimeException('ApiPay request failed with HTTP status '.$response->status().'.');
        }

        // Chỉ chấp nhận phản hồi JSON để tránh xử lý dữ liệu không hợp lệ.
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
