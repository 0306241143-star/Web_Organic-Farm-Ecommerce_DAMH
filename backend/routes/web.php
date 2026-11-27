<?php

use Illuminate\Support\Facades\Route;

// Trang gốc trả phiên bản Laravel để kiểm tra ứng dụng web đang hoạt động.
Route::get('/', function () {
    return ['Laravel' => app()->version()];
});

// Nạp các route đăng nhập web, xác minh email và đặt lại mật khẩu.
require __DIR__.'/auth.php';
