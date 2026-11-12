<?php

/*
 * Phân nhóm API theo 5 khu vực nghiệp vụ và middleware Spatie RBAC.
 */

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});
