<?php

use App\Http\Controllers\Api\Public\BrandStoryController;
use App\Http\Controllers\Api\Public\CategoryController;
use App\Http\Controllers\Api\Public\ProductController;
use App\Http\Controllers\Api\Public\QrTraceController;
use App\Http\Controllers\Api\Public\StorefrontController;
use Illuminate\Support\Facades\Route;

// Dữ liệu rút gọn cho trang storefront: danh mục, sản phẩm, Flash Sale và gói định kỳ.
Route::get('/storefront/categories', [StorefrontController::class, 'categories']);
Route::get('/storefront/products', [StorefrontController::class, 'products']);
Route::get('/flash-sales/active', [StorefrontController::class, 'flashSales']);
Route::get('/subscriptions', [StorefrontController::class, 'subscriptions']);

// Tra cứu danh mục/sản phẩm và truy xuất lô hàng; các route này không yêu cầu đăng nhập.
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show'])->whereNumber('id');
Route::get('/public/san-pham/{id}', [ProductController::class, 'show'])->whereNumber('id');
Route::get('/trace/{code}', [QrTraceController::class, 'show'])->where('code', '[^/]+');

// Nội dung giới thiệu thương hiệu và hồ sơ nông trại công khai.
Route::get('/brand-story', [BrandStoryController::class, 'show']);