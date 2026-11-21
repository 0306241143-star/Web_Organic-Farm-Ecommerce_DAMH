<?php

namespace App\Traits;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    public const ERR_BAD_REQUEST        = 'BAD_REQUEST';
    public const ERR_UNAUTHENTICATED    = 'UNAUTHENTICATED';
    public const ERR_FORBIDDEN          = 'FORBIDDEN';
    public const ERR_NOT_FOUND          = 'NOT_FOUND';
    public const ERR_METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED';
    public const ERR_CONFLICT           = 'CONFLICT';
    public const ERR_VALIDATION         = 'VALIDATION_ERROR';
    public const ERR_TOO_MANY_REQUESTS  = 'TOO_MANY_REQUESTS';
    public const ERR_SERVER             = 'SERVER_ERROR';

    /**
     * Phản hồi thành công chuẩn 6 khóa
     */
    protected function successResponse(
        string $message = 'Thành công.',
        mixed $data = null,
        int $status = 200,
        mixed $meta = null,
        array $headers = []
    ): JsonResponse {
        return response()->json([
            'success'    => true,
            'message'    => $message,
            'error_code' => null,
            'data'       => $data,
            'meta'       => $meta,
            'errors'     => null,
        ], $status, $headers);
    }

    /**
     * Phản hồi phân trang chuẩn 6 khóa
     */
    protected function paginatedResponse(
        LengthAwarePaginator $paginator,
        string $message = 'Lấy danh sách dữ liệu thành công.',
        mixed $items = null
    ): JsonResponse {
        return $this->successResponse(
            message: $message,
            data: $items ?? $paginator->items(),
            status: 200,
            meta: [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
            ]
        );
    }

    /**
     * Phản hồi lỗi chuẩn 6 khóa
     */
    protected function errorResponse(
        string $message = 'Có lỗi xảy ra.',
        int $status = 400,
        string $errorCode = self::ERR_BAD_REQUEST,
        mixed $errors = null,
        mixed $meta = null,
        array $headers = []
    ): JsonResponse {
        return response()->json([
            'success'    => false,
            'message'    => $message,
            'error_code' => $errorCode,
            'data'       => null,
            'meta'       => $meta,
            'errors'     => $errors,
        ], $status, $headers);
    }
}
