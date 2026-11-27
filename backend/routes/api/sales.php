<?php

use App\Http\Controllers\Api\Sales\ClaimResolveController;
use App\Http\Controllers\Api\Sales\DeliveryController;
use App\Http\Controllers\Api\Sales\FlashSaleController;
use App\Http\Controllers\Api\Sales\InventoryFefoController;
use App\Http\Controllers\Api\Sales\OrderProcessController;
use App\Http\Controllers\Api\Sales\RecurringStockAlertController;
use Illuminate\Support\Facades\Route;

// Các API nghiệp vụ bán hàng chỉ dành cho tài khoản sales đã xác thực.
Route::middleware(['auth:sanctum', 'role:sales'])->prefix('sales')->group(function () {
    // Danh sách/chi tiết đơn hàng và xác nhận đơn hoặc thu tiền COD.
    Route::get('/orders', [OrderProcessController::class, 'index']);
    Route::get('/recurring-stock-alerts', [RecurringStockAlertController::class, 'index']);
    Route::get('/orders/{orderId}', [OrderProcessController::class, 'show'])->whereNumber('orderId');
    Route::post('/orders/{orderId}/confirm', [OrderProcessController::class, 'confirm'])->whereNumber('orderId');
    Route::post('/orders/{orderId}/confirm-cod-payment', [OrderProcessController::class, 'confirmCodPayment'])->whereNumber('orderId');
    // Xem cảnh báo thiếu hàng của đơn định kỳ, chọn hàng thay thế hoặc hoãn lịch giao.
    Route::get('/orders/{orderId}/stock-alert/replacements/{detailId}', [RecurringStockAlertController::class, 'replacements'])
        ->whereNumber(['orderId', 'detailId']);
    Route::post('/orders/{orderId}/stock-alert/replace', [RecurringStockAlertController::class, 'replace'])
        ->whereNumber('orderId');
    Route::post('/orders/{orderId}/stock-alert/postpone', [RecurringStockAlertController::class, 'postpone'])
        ->whereNumber('orderId');
    // Điều phối giao hàng và xem tồn kho theo FEFO/các lô sắp hết hạn.
    Route::post('/orders/{orderId}/delivery', [DeliveryController::class, 'dispatch'])->whereNumber('orderId');
    Route::get('/inventory', [InventoryFefoController::class, 'index']);
    Route::get('/expiring-batches', [InventoryFefoController::class, 'expiringBatches']);
    // Quản lý chiến dịch Flash Sale và trạng thái hoạt động của chiến dịch.
    Route::get('/flash-sales', [FlashSaleController::class, 'index']);
    Route::post('/flash-sales', [FlashSaleController::class, 'store']);
    Route::patch('/flash-sales/{campaignId}/status', [FlashSaleController::class, 'updateStatus'])
        ->whereNumber('campaignId');
    // Tiếp nhận, xem và giải quyết khiếu nại của khách hàng.
    Route::get('/claims', [ClaimResolveController::class, 'index']);
    Route::get('/claims/{claimId}', [ClaimResolveController::class, 'show'])->whereNumber('claimId');
    Route::patch('/claims/{claimId}/receive', [ClaimResolveController::class, 'receive'])->whereNumber('claimId');
    Route::post('/claims/{claimId}/resolve', [ClaimResolveController::class, 'resolve'])->whereNumber('claimId');
});
