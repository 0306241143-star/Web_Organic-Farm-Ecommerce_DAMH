<?php

namespace App\Http\Middleware;

use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    use ApiResponse;

    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user()?->loadMissing('vaiTro');

        if (!$user) {
            return $this->errorResponse(
                message: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn.',
                status: 401,
                errorCode: self::ERR_UNAUTHENTICATED
            );
        }

        if ($user->Trang_thai === 'Khoa') {
            $token = $user->currentAccessToken();
            if ($token instanceof PersonalAccessToken) {
                $token->delete();
            }

            return $this->errorResponse(
                message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.',
                status: 403,
                errorCode: self::ERR_FORBIDDEN
            );
        }

        $userRole = strtolower((string) $user->vaiTro?->Ten_vai_tro);
        $allowedRoles = array_map('strtolower', $roles);

        if ($userRole === '' || (!empty($allowedRoles) && !in_array($userRole, $allowedRoles, true))) {
            return $this->errorResponse(
                message: "Vai trò [{$userRole}] không có quyền truy cập chức năng này.",
                status: 403,
                errorCode: self::ERR_FORBIDDEN
            );
        }

        return $next($request);
    }
}