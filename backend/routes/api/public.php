<?php

use App\Http\Controllers\Api\Public\BrandStoryController;
use App\Http\Controllers\Api\Public\CategoryController;
use App\Http\Controllers\Api\Public\ProductController;
use App\Http\Controllers\Api\Public\QrTraceController;
use App\Http\Controllers\Api\Public\StorefrontController;
use Illuminate\Support\Facades\Route;

// Nhóm API Storefront (Trang chủ: Flash Sale, Gói định kỳ & dữ liệu rút gọn)
Route::get('/storefront/categories', [StorefrontController::class, 'categories']);
Route::get('/storefront/products', [StorefrontController::class, 'products']);
Route::get('/flash-sales/active', [StorefrontController::class, 'flashSales']);
Route::get('/subscriptions', [StorefrontController::class, 'subscriptions']);

// Nhóm API Công khai chuẩn: Danh mục, Sản phẩm & Truy xuất nguồn gốc (Guest & Customer)
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show'])->whereNumber('id');
Route::get('/public/san-pham/{id}', [ProductController::class, 'show'])->whereNumber('id');
Route::get('/trace/{code}', [QrTraceController::class, 'show'])->where('code', '[^/]+');

// Câu chuyện thương hiệu & Hồ sơ nông trại
Route::get('/brand-story', [BrandStoryController::class, 'show']);