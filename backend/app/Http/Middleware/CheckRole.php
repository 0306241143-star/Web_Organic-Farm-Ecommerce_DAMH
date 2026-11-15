<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success'    => false,
                'message'    => 'Vui lòng đăng nhập để tiếp tục.',
                'error_code' => 'UNAUTHENTICATED',
                'errors'     => null,
            ], 401);
        }

        if ($user->Trang_thai === 'Khoa') {
            return response()->json([
                'success'    => false,
                'message'    => 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.',
                'error_code' => 'FORBIDDEN',
                'errors'     => null,
            ], 403);
        }

        $userRole = $user->vaiTro?->Ten_vai_tro;

        if (!empty($roles) && !in_array($userRole, $roles, true)) {
            return response()->json([
                'success'    => false,
                'message'    => "Vai trò [{$userRole}] không có quyền truy cập chức năng này.",
                'error_code' => 'FORBIDDEN',
                'errors'     => null,
            ], 403);
        }

        return $next($request);
    }
}