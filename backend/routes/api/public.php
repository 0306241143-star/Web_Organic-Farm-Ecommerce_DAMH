<?php

use App\Http\Controllers\Api\Public\CategoryController;
use App\Http\Controllers\Api\Public\ProductController;
use App\Http\Controllers\Api\Public\QrTraceController;
use App\Http\Controllers\Api\Public\StorefrontController;
use Illuminate\Support\Facades\Route;

// Home Page danh mucj + sản phẩm bán chạy và flash sale
Route::get('/categories', [StorefrontController::class, 'categories']);
Route::get('/products', [StorefrontController::class, 'products']);
Route::get('/flash-sales/active', [StorefrontController::class, 'flashSales']);
Route::get('/subscriptions', [StorefrontController::class, 'subscriptions']);

// Nhóm API Công khai: Danh mục & Sản phẩm nông sản (Guest & Customer)
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show'])->whereNumber('id');
Route::get('/public/san-pham/{id}', [ProductController::class, 'show'])->whereNumber('id');
Route::get('/trace/{code}', [QrTraceController::class, 'show'])->where('code', '[^/]+');

//Footer 
Route::get('/brand-story', [\App\Http\Controllers\Api\Public\BrandStoryController::class, 'show']);