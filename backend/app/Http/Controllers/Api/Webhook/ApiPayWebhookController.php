<?php

/*
 * Điểm nhận webhook ApiPay; xử lý giao dịch ở Giai đoạn 4.
 */

namespace App\Http\Controllers\Api\Webhook;

use App\Http\Controllers\Controller;
use App\Models\DangKyGoi;
use App\Models\DonHang;
use App\Models\ThanhToan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ApiPayWebhookController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $secret = config('services.apipay.webhook_secret');
        $signature = $request->header('ApiPay-Signature');
        $rawBody = $request->getContent();

        if (! is_string($secret) || $secret === '' || ! is_string($signature) || $signature === '') {
            return response()->json(['message' => 'Webhook signature is not configured or missing.'], 401);
        }

        $expectedSignature = hash_hmac('sha256', $rawBody, $secret);
        if (! hash_equals($expectedSignature, $signature)) {
            return response()->json(['message' => 'Invalid webhook signature.'], 401);
        }

        $payload = json_decode($rawBody, true);
        if (! is_array($payload) || ! is_string($payload['event'] ?? null)) {
            return response()->json(['message' => 'Invalid webhook payload.'], 400);
        }

        if ($payload['event'] !== 'transaction.in') {
            return response()->json(['received' => true]);
        }

        $data = $payload['data'] ?? null;
        if (
            ($payload['sandbox'] ?? false) === true
            || ($payload['liveTest'] ?? false) === true
            || (is_array($data) && (($data['sandbox'] ?? false) === true || ($data['liveTest'] ?? false) === true))
        ) {
            Log::info('ApiPay sandbox webhook was acknowledged without changing an order.', [
                'transaction_id' => is_array($data) && is_string($data['transactionId'] ?? null)
                    ? $data['transactionId']
                    : null,
            ]);

            return response()->json(['received' => true, 'sandbox' => true]);
        }

        if (
            ! is_array($data)
            || ! is_string($data['transactionId'] ?? null)
            || ! is_string($data['content'] ?? null)
            || ! is_string($data['amount'] ?? null)
            || ! preg_match('/^\d+$/', $data['amount'])
            || ($data['type'] ?? null) !== 'IN'
        ) {
            return response()->json(['message' => 'Invalid incoming transaction data.'], 400);
        }

        // Hỗ trợ mã đơn lẻ DH... và mã đăng ký gói DK...; đều có hậu tố ngẫu nhiên để tránh trùng.
        if (! preg_match('/(DH|DK)(\d+)X[A-Z0-9]{8}/i', $data['content'], $matches)) {
            Log::warning('ApiPay webhook content did not contain a valid payment reference.', [
                'transaction_id' => $data['transactionId'],
            ]);

            return response()->json([
                'received' => true,
                'matched' => false,
            ]);
        }

        $referenceCode = strtoupper($matches[0]);
        $referenceType = strtoupper($matches[1]);
        $referenceId = (int) $matches[2];

        $result = DB::transaction(function () use ($data, $referenceCode, $referenceType, $referenceId): string {
            if (ThanhToan::query()->where('Ma_giao_dich_apipay', $data['transactionId'])->exists()) {
                return 'duplicate';
            }

            // Khớp cả loại và ID đối tượng để nội dung chuyển khoản không thể đổi loại đối tượng.
            $payment = ThanhToan::query()
                ->where('Phuong_thuc', 'ApiPay')
                ->where('Trang_thai', 'Khoi_tao')
                ->where(function ($query) use ($referenceType, $referenceId): void {
                    if ($referenceType === 'DK') {
                        $query->where('Ma_dang_ky_goi', $referenceId);
                    } else {
                        $query->where('Ma_don_hang', $referenceId);
                    }
                })
                ->where('Noi_dung_thanh_toan', $referenceCode)
                ->lockForUpdate()
                ->first();

            if (! $payment) {
                Log::warning('ApiPay webhook transaction did not match a pending order payment.', [
                    'transaction_id' => $data['transactionId'],
                    'reference_code' => $referenceCode,
                ]);

                return 'unmatched';
            }

            if ((int) $data['amount'] !== (int) $payment->So_tien) {
                Log::error('ApiPay webhook amount did not match the pending order payment.', [
                    'transaction_id' => $data['transactionId'],
                    'payment_id' => $payment->Ma_thanh_toan,
                ]);

                return 'amount_mismatch';
            }

            if ($referenceType === 'DK') {
                $registration = DangKyGoi::query()
                    ->where('Ma_dang_ky', $payment->Ma_dang_ky_goi)
                    ->where('Trang_thai', 'Cho_thanh_toan')
                    ->lockForUpdate()
                    ->first();

                if (! $registration) {
                    Log::warning('ApiPay webhook matched a subscription payment that is no longer pending.', [
                        'transaction_id' => $data['transactionId'],
                        'payment_id' => $payment->Ma_thanh_toan,
                    ]);

                    return 'unmatched';
                }
            }

            $payment->update([
                'Ma_giao_dich_apipay' => $data['transactionId'],
                'Ma_tham_chieu_ngan_hang' => is_string($data['referenceCode'] ?? null)
                    ? $data['referenceCode']
                    : null,
                'Trang_thai' => 'Thanh_cong',
                'Thoi_gian_thanh_toan' => is_string($data['transactionDate'] ?? null)
                    && strtotime($data['transactionDate']) !== false
                    ? $data['transactionDate']
                    : now(),
            ]);

            if ($payment->Ma_don_hang) {
                DonHang::query()
                    ->where('Ma_don_hang', $payment->Ma_don_hang)
                    ->where('Trang_thai', 'Cho_thanh_toan')
                    ->update(['Trang_thai' => 'Cho_xac_nhan']);
            } elseif ($payment->Ma_dang_ky_goi) {
                DangKyGoi::query()
                    ->where('Ma_dang_ky', $payment->Ma_dang_ky_goi)
                    ->where('Trang_thai', 'Cho_thanh_toan')
                    ->update(['Trang_thai' => 'Dang_hoat_dong']);
            }

            return 'processed';
        });

        return response()->json([
            'received' => true,
            'matched' => in_array($result, ['processed', 'duplicate'], true),
        ]);
    }
}
