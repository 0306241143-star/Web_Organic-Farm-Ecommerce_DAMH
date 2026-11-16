<?php

namespace App\Http\Middleware;

use App\Traits\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    use ApiResponse;

    /**
     * Xử lý một request đến, kiểm tra xem user hiện tại có quyền (permission) yêu cầu hay không.
     */
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user()?->loadMissing('vaiTro.quyens');

        if (!$user) {
            return $this->errorResponse(
                message: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn.',
                status: 401,
                errorCode: self::ERR_UNAUTHENTICATED
            );
        }

        // Kiểm tra trạng thái tài khoản có bị khóa hay không
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

        // Lấy danh sách tên quyền của user thông qua vai trò
        $userPermissions = $user->vaiTro?->quyens
            ?->pluck('Ten_quyen')
            ->map(fn ($p) => strtolower(trim((string) $p)))
            ->all() ?? [];

        // Nếu tài khoản là Admin tuyệt đối, có thể cho phép qua luôn (hoặc dựa hoàn toàn vào bảng quyền)
        $userRole = strtolower((string) $user->vaiTro?->Ten_vai_tro);
        if ($userRole === 'admin') {
            return $next($request);
        }

        // Chuẩn hóa danh sách quyền yêu cầu từ route middleware
        $requiredPermissions = array_map(fn ($p) => strtolower(trim($p)), $permissions);

        // Kiểm tra xem user có sở hữu ít nhất một trong các quyền yêu cầu hay không
        $hasPermission = !empty(array_intersect($requiredPermissions, $userPermissions));

        if (!$hasPermission) {
            return $this->errorResponse(
                message: 'Bạn không có quyền thực hiện hành động này (Thiếu quyền hạn hệ thống).',
                status: 403,
                errorCode: self::ERR_FORBIDDEN,
                meta: ['required_permissions' => $permissions]
            );
        }

        return $next($request);
    }
}