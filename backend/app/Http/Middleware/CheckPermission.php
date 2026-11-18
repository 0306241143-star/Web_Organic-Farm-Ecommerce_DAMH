<?php

namespace App\Http\Middleware;

use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    use ApiResponse;

    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return $this->errorResponse(
                message: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn.',
                status: 401,
                errorCode: self::ERR_UNAUTHENTICATED
            );
        }

        if ($user->Trang_thai === 'Khoa') {
            $user->currentAccessToken()?->delete();

            return $this->errorResponse(
                message: 'Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên.',
                status: 403,
                errorCode: self::ERR_FORBIDDEN
            );
        }

        if ($user->getRoleSlug() === 'admin' || empty($permissions)) {
            return $next($request);
        }

        foreach ($permissions as $permission) {
            if ($user->hasPermission(trim($permission))) {
                return $next($request);
            }
        }

        return $this->errorResponse(
            message: 'Bạn không được cấp quyền thực hiện thao tác này.',
            status: 403,
            errorCode: self::ERR_FORBIDDEN
        );
    }
}
