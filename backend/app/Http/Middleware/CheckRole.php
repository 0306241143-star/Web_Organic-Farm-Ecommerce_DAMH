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
        // Lấy tài khoản đã đăng nhập để đối chiếu vai trò được phép.
        $user = $request->user();

        // Yêu cầu không có người dùng xác thực không được đi tiếp.
        if (!$user) {
            return $this->errorResponse(
                message: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn.',
                status: 401,
                errorCode: self::ERR_UNAUTHENTICATED
            );
        }

        // Thu hồi token của tài khoản bị khóa rồi từ chối truy cập.
        if ($user->Trang_thai === 'Khoa') {
            $user->currentAccessToken()?->delete();

            return $this->errorResponse(
                message: 'Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên.',
                status: 403,
                errorCode: self::ERR_FORBIDDEN
            );
        }

        // Chuẩn hóa vai trò cấu hình để so sánh không phân biệt chữ hoa và khoảng trắng.
        $allowedRoles = array_map(fn ($r) => strtolower(trim($r)), $roles);

        // Chỉ kiểm tra khi có danh sách vai trò; sai vai trò nhận phản hồi 403.
        if (!empty($allowedRoles) && !$user->hasRole($allowedRoles)) {
            return $this->errorResponse(
                message: 'Vai trò hiện tại không có quyền truy cập chức năng này.',
                status: 403,
                errorCode: self::ERR_FORBIDDEN
            );
        }

        // Vai trò hợp lệ hoặc không cấu hình giới hạn thì chuyển yêu cầu sang middleware kế tiếp.
        return $next($request);
    }
}
