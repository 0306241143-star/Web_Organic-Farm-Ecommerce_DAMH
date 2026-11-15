<?php

use App\Http\Middleware\CheckRole;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => CheckRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (Throwable $e, Request $request) {
            if (!$request->is('api/*') && !$request->expectsJson()) {
                return null;
            }

            if ($e instanceof ValidationException) {
                return response()->json([
                    'success'    => false,
                    'message'    => 'Dữ liệu đầu vào không hợp lệ.',
                    'error_code' => 'VALIDATION_ERROR',
                    'errors'     => $e->errors(),
                ], 422);
            }

            if ($e instanceof AuthenticationException) {
                return response()->json([
                    'success'    => false,
                    'message'    => 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
                    'error_code' => 'UNAUTHENTICATED',
                    'errors'     => null,
                ], 401);
            }

            if ($e instanceof AccessDeniedHttpException) {
                return response()->json([
                    'success'    => false,
                    'message'    => 'Bạn không có quyền thực hiện thao tác này.',
                    'error_code' => 'FORBIDDEN',
                    'errors'     => null,
                ], 403);
            }

            if ($e instanceof NotFoundHttpException) {
                return response()->json([
                    'success'    => false,
                    'message'    => 'Không tìm thấy tài nguyên hoặc đường dẫn API yêu cầu.',
                    'error_code' => 'NOT_FOUND',
                    'errors'     => null,
                ], 404);
            }

            return response()->json([
                'success'    => false,
                'message'    => config('app.debug') ? $e->getMessage() : 'Lỗi xử lý nội bộ máy chủ.',
                'error_code' => 'SERVER_ERROR',
                'errors'     => null,
            ], 500);
        });
    })->create();