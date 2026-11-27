<?php

use App\Http\Controllers\Api\Customer\CartController;
use App\Http\Controllers\Api\Customer\CheckoutController;
use App\Http\Controllers\Api\Customer\ClaimController;
use App\Http\Controllers\Api\Customer\OrderController;
use App\Http\Controllers\Api\Customer\RetailOrderController;
use App\Http\Controllers\Api\Customer\RewardPointController;
use App\Http\Controllers\Api\Customer\SubscriptionController;
use Illuminate\Support\Facades\Route;

// Mọi endpoint bên dưới yêu cầu token Sanctum hợp lệ và vai trò khách hàng.
Route::middleware(['auth:sanctum', 'role:customer'])->prefix('customer')->group(function () {
    // Giỏ hàng được xác định từ người dùng của token, không nhận user_id từ client.
    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart/items', [CartController::class, 'store']);
    Route::put('/cart/items/{productId}', [CartController::class, 'update'])->whereNumber('productId');
    Route::delete('/cart/items/{productId}', [CartController::class, 'destroy'])->whereNumber('productId');
    // Quản lý địa chỉ giao hàng, thông tin hồ sơ và đổi mật khẩu của chính khách hiện tại.
    Route::get('/addresses', [RetailOrderController::class, 'addresses']);
    Route::post('/addresses', [RetailOrderController::class, 'storeAddress']);
    Route::put('/addresses/{id}', [RetailOrderController::class, 'updateAddress'])->whereNumber('id');
    Route::delete('/addresses/{id}', [RetailOrderController::class, 'destroyAddress'])->whereNumber('id');
    Route::patch('/addresses/{id}/default', [RetailOrderController::class, 'setDefaultAddress'])->whereNumber('id');
    Route::post('/change-password', [RetailOrderController::class, 'changePassword']);
    Route::put('/profile', [RetailOrderController::class, 'updateProfile']);
    // Tra cứu điểm thưởng, đơn hàng của khách và trạng thái khiếu nại.
    Route::get('/rewards', [RewardPointController::class, 'index']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{orderId}', [OrderController::class, 'show'])->whereNumber('orderId');
    Route::get('/claims', [ClaimController::class, 'index']);
    Route::post('/claims', [ClaimController::class, 'store']);
    Route::get('/claims/{claimId}', [ClaimController::class, 'show'])->whereNumber('claimId');
    // Tạo báo giá, đặt/hủy đơn và truy vấn các phương thức thanh toán khả dụng.
    Route::post('/checkout/quote', [RetailOrderController::class, 'quote']);
    Route::post('/checkout/orders', [RetailOrderController::class, 'store']);
    Route::get('/checkout/orders/{orderId}', [RetailOrderController::class, 'status'])->whereNumber('orderId');
    Route::post('/checkout/orders/{orderId}/cancel', [RetailOrderController::class, 'cancel'])->whereNumber('orderId');
    Route::get('/checkout/options', [CheckoutController::class, 'options']);
    Route::post('/checkout', [CheckoutController::class, 'store']);
    // Đăng ký, xem và điều khiển lịch giao/thanh toán gói định kỳ của khách hiện tại.
    Route::post('/subscriptions', [SubscriptionController::class, 'store']);
    Route::get('/subscriptions', [SubscriptionController::class, 'index']);
    Route::get('/subscriptions/{subscriptionId}', [SubscriptionController::class, 'show'])->whereNumber('subscriptionId');
    Route::post('/subscriptions/{subscriptionId}/pause', [SubscriptionController::class, 'pause'])->whereNumber('subscriptionId');
    Route::post('/subscriptions/{subscriptionId}/resume', [SubscriptionController::class, 'resume'])->whereNumber('subscriptionId');
    Route::post('/subscriptions/{subscriptionId}/checkout', [SubscriptionController::class, 'checkout'])->whereNumber('subscriptionId');
    Route::post('/subscriptions/{subscriptionId}/cancel', [SubscriptionController::class, 'cancel'])->whereNumber('subscriptionId');
});