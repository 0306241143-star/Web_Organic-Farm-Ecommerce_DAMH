<?php

namespace App\Http\Middleware;

use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    use ApiResponse;

    public function handle(Request $request, Closure $next, string ...$roles): Response
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

        $allowedRoles = array_map(fn ($r) => strtolower(trim($r)), $roles);

        if (!empty($allowedRoles) && !$user->hasRole($allowedRoles)) {
            return $this->errorResponse(
                message: 'Vai trò hiện tại không có quyền truy cập chức năng này.',
                status: 403,
                errorCode: self::ERR_FORBIDDEN
            );
        }

        return $next($request);
    }
}
