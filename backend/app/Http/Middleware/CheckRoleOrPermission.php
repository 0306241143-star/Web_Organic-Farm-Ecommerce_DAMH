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
        // Lấy tài khoản hiện tại để kiểm tra vai trò hoặc quyền trên tuyến.
        $user = $request->user();

        // Chặn yêu cầu chưa xác thực bằng phản hồi 401.
        if (!$user) {
            return $this->errorResponse(
                message: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn.',
                status: 401,
                errorCode: self::ERR_UNAUTHENTICATED
            );
        }

        // Thu hồi token và từ chối tài khoản đã bị khóa.
        if ($user->Trang_thai === 'Khoa') {
            $user->currentAccessToken()?->delete();

            return $this->errorResponse(
                message: 'Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên.',
                status: 403,
                errorCode: self::ERR_FORBIDDEN
            );
        }

        // Danh sách trống nghĩa là tuyến không giới hạn vai trò hay quyền tại middleware này.
        if (empty($items)) {
            return $next($request);
        }

        // Chấp nhận nếu người dùng khớp bất kỳ vai trò hoặc quyền nào đã cấu hình.
        foreach ($items as $item) {
            $normalized = trim($item);
            if ($user->hasRole(strtolower($normalized)) || $user->hasPermission($normalized)) {
                return $next($request);
            }
        }

        // Không khớp mục nào thì kết thúc bằng phản hồi 403.
        return $this->errorResponse(
            message: 'Bạn không có vai trò hoặc quyền hạn phù hợp để truy cập.',
            status: 403,
            errorCode: self::ERR_FORBIDDEN
        );
    }
}
