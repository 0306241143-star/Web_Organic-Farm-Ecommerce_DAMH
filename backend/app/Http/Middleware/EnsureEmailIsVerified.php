<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Chặn request không có người dùng hoặc email chưa xác minh; tài khoản không yêu cầu xác minh vẫn được qua.
        if (! $request->user() ||
            ($request->user() instanceof MustVerifyEmail &&
            ! $request->user()->hasVerifiedEmail())) {
            // Trả mã 409 để báo rằng trạng thái email cần được xử lý trước khi tiếp tục.
            return response()->json(['message' => 'Your email address is not verified.'], 409);
        }

        // Email đã xác minh hoặc không thuộc diện xác minh thì chuyển tiếp request.
        return $next($request);
    }
}
