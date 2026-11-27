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
        // Lấy danh tính đã được xác thực để quyết định quyền truy cập tuyến.
        $user = $request->user();

        // Không có phiên đăng nhập thì dừng yêu cầu và trả lỗi 401.
        if (!$user) {
            return $this->errorResponse(
                message: 'Chưa đăng nhập hoặc phiên làm việc đã hết hạn.',
                status: 401,
                errorCode: self::ERR_UNAUTHENTICATED
            );
        }

        // Thu hồi token của tài khoản bị khóa và từ chối yêu cầu hiện tại.
        if ($user->Trang_thai === 'Khoa') {
            $user->currentAccessToken()?->delete();

            return $this->errorResponse(
                message: 'Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên.',
                status: 403,
                errorCode: self::ERR_FORBIDDEN
            );
        }

        // Quản trị viên được bỏ qua kiểm tra quyền; danh sách rỗng cũng không giới hạn quyền.
        if ($user->getRoleSlug() === 'admin' || empty($permissions)) {
            return $next($request);
        }

        // Chỉ cần có một quyền trong danh sách là đủ để tiếp tục xử lý.
        foreach ($permissions as $permission) {
            if ($user->hasPermission(trim($permission))) {
                return $next($request);
            }
        }

        // Không có quyền phù hợp thì trả lỗi 403 thay vì chuyển tiếp yêu cầu.
        return $this->errorResponse(
            message: 'Bạn không được cấp quyền thực hiện thao tác này.',
            status: 403,
            errorCode: self::ERR_FORBIDDEN
        );
    }
}
