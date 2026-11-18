<?php

namespace App\Http\Middleware;

use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRoleOrPermission
{
    use ApiResponse;

    public function handle(Request $request, Closure $next, string ...$items): Response
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

        if (empty($items)) {
            return $next($request);
        }

        foreach ($items as $item) {
            $normalized = trim($item);
            if ($user->hasRole(strtolower($normalized)) || $user->hasPermission($normalized)) {
                return $next($request);
            }
        }

        return $this->errorResponse(
            message: 'Bạn không có vai trò hoặc quyền hạn phù hợp để truy cập.',
            status: 403,
            errorCode: self::ERR_FORBIDDEN
        );
    }
}
