<?php

use App\Http\Controllers\Api\Sales\OrderProcessController;
use App\Http\Controllers\Api\Sales\ClaimResolveController;
use App\Http\Controllers\Api\Sales\FlashSaleController;
use App\Http\Controllers\Api\Sales\InventoryFefoController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'role:sales'])->prefix('sales')->group(function () {
    Route::get('/orders', [OrderProcessController::class, 'index']);
    Route::get('/orders/{orderId}', [OrderProcessController::class, 'show'])->whereNumber('orderId');
    Route::post('/orders/{orderId}/confirm', [OrderProcessController::class, 'confirm'])->whereNumber('orderId');
    Route::post('/orders/{orderId}/confirm-cod-payment', [OrderProcessController::class, 'confirmCodPayment'])->whereNumber('orderId');
    Route::get('/inventory', [InventoryFefoController::class, 'index']);
    Route::get('/expiring-batches', [InventoryFefoController::class, 'expiringBatches']);
    Route::get('/flash-sales', [FlashSaleController::class, 'index']);
    Route::post('/flash-sales', [FlashSaleController::class, 'store']);
    Route::patch('/flash-sales/{campaignId}/status', [FlashSaleController::class, 'updateStatus'])
        ->whereNumber('campaignId');
    Route::get('/claims', [ClaimResolveController::class, 'index']);
    Route::get('/claims/{claimId}', [ClaimResolveController::class, 'show'])->whereNumber('claimId');
    Route::patch('/claims/{claimId}/receive', [ClaimResolveController::class, 'receive'])->whereNumber('claimId');
    Route::post('/claims/{claimId}/resolve', [ClaimResolveController::class, 'resolve'])->whereNumber('claimId');
});