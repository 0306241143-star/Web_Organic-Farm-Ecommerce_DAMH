<?php

use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\ProductController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\SystemSettingController;
use App\Http\Controllers\Api\Admin\UserRoleController;
use App\Http\Controllers\Api\Admin\SubscriptionPackageController;
use App\Http\Controllers\Api\Admin\FarmProfileController;
use Illuminate\Support\Facades\Route;

// Tất cả route trong nhóm cần token Sanctum và vai trò quản trị viên.
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    // Báo cáo tổng quan và quản lý tài khoản/trạng thái người dùng.
    Route::get('/reports/dashboard', [ReportController::class, 'dashboard']);
    Route::get('/users', [UserRoleController::class, 'index']);
    Route::put('/users/{id}/status', [UserRoleController::class, 'updateStatus']);
    Route::get('/settings', [SystemSettingController::class, 'index']);
    Route::put('/settings', [SystemSettingController::class, 'update']);

    // CRUD danh mục và bật/tắt trạng thái danh mục.
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::post('/categories', [CategoryController::class, 'store']);
    Route::put('/categories/{id}', [CategoryController::class, 'update']);
    Route::patch('/categories/{id}/status', [CategoryController::class, 'updateStatus']);
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy']);

    // CRUD sản phẩm và bật/tắt trạng thái kinh doanh.
    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::patch('/products/{id}/status', [ProductController::class, 'updateStatus']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    // Đọc và cập nhật cấu hình vận hành hệ thống.
    Route::get('/settings', [\App\Http\Controllers\Api\Admin\SystemSettingController::class, 'index']);
    Route::put('/settings', [\App\Http\Controllers\Api\Admin\SystemSettingController::class, 'update']);

    // CRUD gói sản phẩm định kỳ và cập nhật trạng thái gói.
    Route::get('/subscriptions', [SubscriptionPackageController::class, 'index']);
    Route::post('/subscriptions', [SubscriptionPackageController::class, 'store']);
    Route::put('/subscriptions/{id}', [SubscriptionPackageController::class, 'update']);
    Route::patch('/subscriptions/{id}/status', [SubscriptionPackageController::class, 'updateStatus']);
    Route::delete('/subscriptions/{id}', [SubscriptionPackageController::class, 'destroy']);

    // Cập nhật hồ sơ nông trại, quản lý ảnh và chuẩn hóa địa chỉ.
    Route::get('/settings/farm', [FarmProfileController::class, 'show']);
    Route::put('/settings/farm', [FarmProfileController::class, 'update']);
    Route::delete('/settings/farm/images/{imageId}', [FarmProfileController::class, 'destroyImage']);
    Route::post('/settings/farm/geocode', [FarmProfileController::class, 'geocodeAddress']);


    // Quản lý chi tiết tài khoản người dùng/nhân viên và phân trang danh sách.
    Route::get('/users', [UserRoleController::class, 'index']);
    Route::post('/users', [UserRoleController::class, 'store']);
    Route::put('/users/{id}', [UserRoleController::class, 'update'])->whereNumber('id');
    Route::put('/users/{id}/status', [UserRoleController::class, 'updateStatus'])->whereNumber('id');

    // Đọc và cập nhật tập quyền được gán cho từng vai trò.
    Route::get('/roles-permissions', [UserRoleController::class, 'rolesAndPermissions']);
    Route::put('/roles/{roleId}/permissions', [UserRoleController::class, 'updateRolePermissions'])->whereNumber('roleId');
});