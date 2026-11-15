<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    protected function successResponse(
        mixed $data = null,
        string $message = 'Thao tác thành công',
        int $statusCode = 200,
        mixed $meta = null
    ): JsonResponse {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data'    => $data,
            'meta'    => $meta,
        ], $statusCode);
    }

    protected function errorResponse(
        string $message = 'Có lỗi xảy ra',
        int $statusCode = 400,
        string $errorCode = 'BUSINESS_ERROR',
        mixed $errors = null
    ): JsonResponse {
        return response()->json([
            'success'    => false,
            'message'    => $message,
            'error_code' => $errorCode,
            'errors'     => $errors,
        ], $statusCode);
    }
}