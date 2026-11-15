<?php

use App\Http\Controllers\Api\AuthController;
use Illuminate\Support\Facades\Route;

// 1. Nhóm Public (Guest & Customer chưa đăng nhập)
Route::get('/ping', [AuthController::class, 'ping']);
Route::post('/auth/login', [AuthController::class, 'login']);

// 2. Nhóm yêu cầu đăng nhập (Sanctum)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Khu vực Khách hàng (Customer)
    Route::middleware('role:Customer')->prefix('customer')->group(function () {
        Route::get('/ping-role', fn () => response()->json(['success' => true, 'message' => 'OK - Quyền Customer', 'data' => null]));
    });

    // Khu vực Nhân viên Nông trại (Farm_Staff - cô lập tuyệt đối doanh thu & khách hàng)
    Route::middleware('role:Farm_Staff,Admin')->prefix('farm')->group(function () {
        Route::get('/ping-role', fn () => response()->json(['success' => true, 'message' => 'OK - Quyền Farm_Staff', 'data' => null]));
    });

    // Khu vực Nhân viên Kinh doanh / CSKH (Sales)
    Route::middleware('role:Sales,Admin')->prefix('sales')->group(function () {
        Route::get('/ping-role', fn () => response()->json(['success' => true, 'message' => 'OK - Quyền Sales', 'data' => null]));
    });

    // Khu vực Quản trị viên (Admin)
    Route::middleware('role:Admin')->prefix('admin')->group(function () {
        Route::get('/ping-role', fn () => response()->json(['success' => true, 'message' => 'OK - Quyền Admin', 'data' => null]));
    });
});