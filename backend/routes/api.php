<?php

/*
 * Phân nhóm API theo 5 khu vực nghiệp vụ và middleware Spatie RBAC.
 */

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

// Webhook công khai từ ApiPay (không qua auth:sanctum, xác thực bằng HMAC signature)
Route::post('/webhooks/apipay', \App\Http\Controllers\Api\Webhook\ApiPayWebhookController::class);

// Nhóm API Khách hàng (bảo vệ bằng auth:sanctum + role:customer)
Route::middleware(['auth:sanctum', 'role:customer'])->prefix('customer')->group(function () {
    Route::post('/checkout', [\App\Http\Controllers\Api\Customer\CheckoutController::class, 'store']);
});
