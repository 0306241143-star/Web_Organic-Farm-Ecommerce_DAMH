<?php

use App\Http\Controllers\Api\FarmStaff\BatchController;
use App\Http\Controllers\Api\FarmStaff\BatchQrController;
use App\Http\Controllers\Api\FarmStaff\CertificateController;
use App\Http\Controllers\Api\FarmStaff\CultivationPlotController;
use App\Http\Controllers\Api\FarmStaff\FarmInfoController;
use App\Http\Controllers\Api\FarmStaff\FarmingLogController;
use App\Http\Controllers\Api\FarmStaff\SeasonController;
use Illuminate\Support\Facades\Route;

// Nhóm API Nhân viên Nông trại (bảo vệ bằng auth:sanctum + role:farm_staff)
Route::middleware(['auth:sanctum', 'role:farm_staff'])->prefix('farm')->group(function () {
    Route::get('/seasons', [SeasonController::class, 'index']);
    Route::post('/seasons', [SeasonController::class, 'store']);
    Route::get('/seasons/{id}', [SeasonController::class, 'show']);
    Route::put('/seasons/{id}', [SeasonController::class, 'update']);
    Route::delete('/seasons/{id}', [SeasonController::class, 'destroy']);
    Route::post('/seasons/{id}/plots', [CultivationPlotController::class, 'store']);
    Route::put('/seasons/{id}/plots/{plotId}', [CultivationPlotController::class, 'update']);
    Route::delete('/seasons/{id}/plots/{plotId}', [CultivationPlotController::class, 'destroy']);
    Route::get('/products', [CultivationPlotController::class, 'getProducts']);
    Route::get('/info', [FarmInfoController::class, 'show']);
    Route::put('/info', [FarmInfoController::class, 'update']);

    Route::get('/farming-logs', [FarmingLogController::class, 'index']);
    Route::post('/farming-logs', [FarmingLogController::class, 'store']);
    Route::delete('/farming-logs/{id}', [FarmingLogController::class, 'destroy']);

    // Quản lý lô hàng thu hoạch & QR (CV04.18, CV04.20, CV04.21)
    Route::get('/batches/eligible-plots', [BatchController::class, 'eligiblePlots']);
    Route::get('/batches/disposals', [BatchController::class, 'disposalsList']);
    Route::get('/batches', [BatchController::class, 'index']);
    Route::post('/batches', [BatchController::class, 'store']);
    Route::get('/batches/{id}', [BatchController::class, 'show']);
    Route::put('/batches/{id}', [BatchController::class, 'update']);
    Route::post('/batches/{id}/wastage', [BatchController::class, 'recordWastage']);
    Route::post('/batches/{id}/qr', [BatchQrController::class, 'generate']);
    Route::get('/batches/{id}/qr-print', [BatchQrController::class, 'printTemplate']);

    // Quản lý chứng nhận chất lượng & kết quả kiểm định gắn vào lô hàng
    Route::get('/certificates', [CertificateController::class, 'index']);
    Route::post('/certificates', [CertificateController::class, 'store']);
    Route::put('/certificates/{id}', [CertificateController::class, 'update']);
    Route::delete('/certificates/{id}', [CertificateController::class, 'destroy']);

    Route::post('/batches/{id}/wastage', [BatchController::class, 'recordWastage'])->whereNumber('id');
    Route::get('/disposals', [BatchController::class, 'disposalsList']);
});