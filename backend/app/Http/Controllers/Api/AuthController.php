<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NguoiDung;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    use ApiResponse;

    private const MAX_LOGIN_ATTEMPTS = 5;
    private const DECAY_SECONDS = 60;
    private const TOKEN_TTL_MINUTES = 1440; // 24 giờ

    public function ping(): JsonResponse
    {
        return $this->successResponse('Kết nối Laravel API thành công.', [
            'service'   => 'Organic Farm E-Commerce API',
            'timestamp' => now()->toIso8601String(),
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string'],
        ], [
            'email.required'    => 'Vui lòng nhập địa chỉ email.',
            'email.email'       => 'Địa chỉ email không đúng định dạng.',
            'password.required' => 'Vui lòng nhập mật khẩu.',
        ]);

        $throttleKey = $this->throttleKey($validated['email'], $request->ip());

        // 1. Kiểm tra giới hạn đăng nhập thất bại (Rate Limit)
        if (RateLimiter::tooManyAttempts($throttleKey, self::MAX_LOGIN_ATTEMPTS)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            return $this->errorResponse(
                message: "Đăng nhập thất bại quá nhiều lần. Vui lòng thử lại sau {$seconds} giây.",
                status: 429,
                errorCode: self::ERR_TOO_MANY_REQUESTS,
                meta: ['retry_after' => $seconds],
                headers: ['Retry-After' => (string) $seconds]
            );
        }

        $user = NguoiDung::with('vaiTro.quyens')
            ->where('Email', $validated['email'])
            ->first();

        if (!$user || !Hash::check($validated['password'], $user->Mat_khau_ma_hoa)) {
            RateLimiter::hit($throttleKey, self::DECAY_SECONDS);
            $remaining = RateLimiter::remaining($throttleKey, self::MAX_LOGIN_ATTEMPTS);

            return $this->errorResponse(
                message: 'Email hoặc mật khẩu không chính xác.',
                status: 401,
                errorCode: self::ERR_UNAUTHENTICATED,
                meta: ['remaining_attempts' => max(0, $remaining)]
            );
        }

        // Kiểm tra trạng thái khóa tài khoản
        if ($user->Trang_thai === 'Khoa') {
            return $this->errorResponse(
                message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.',
                status: 403,
                errorCode: self::ERR_FORBIDDEN
            );
        }

        // Đăng nhập hợp lệ -> Xóa bộ đếm sai & dọn token cũ đã quá hạn
        RateLimiter::clear($throttleKey);
        $user->tokens()->whereNotNull('expires_at')->where('expires_at', '<', now())->delete();

        // 2. Tạo Bearer Token kèm thời hạn hết hạn (expires_at)
        $ttlMinutes = (int) config('sanctum.expiration', self::TOKEN_TTL_MINUTES);
        $expiresAt = now()->addMinutes($ttlMinutes > 0 ? $ttlMinutes : self::TOKEN_TTL_MINUTES);
        $tokenResult = $user->createToken('web-spa-token', ['*'], $expiresAt);

        return $this->successResponse('Đăng nhập thành công.', [
            'access_token' => $tokenResult->plainTextToken,
            'token_type'   => 'Bearer',
            'expires_at'   => $expiresAt->toIso8601String(),
            'user'         => $this->formatUserPayload($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var NguoiDung $user */
        $user = $request->user();
        $currentToken = $user->currentAccessToken();

        // Kiểm tra & thu hồi nếu token đã quá hạn
        if ($currentToken instanceof PersonalAccessToken && $currentToken->expires_at && $currentToken->expires_at->isPast()) {
            $currentToken->delete();

            return $this->errorResponse(
                message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
                status: 401,
                errorCode: self::ERR_UNAUTHENTICATED
            );
        }

        // Kiểm tra nếu tài khoản vừa bị khóa trong lúc đang mở phiên
        if ($user->Trang_thai === 'Khoa') {
            if ($currentToken instanceof PersonalAccessToken) {
                $currentToken->delete();
            }

            return $this->errorResponse(
                message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên.',
                status: 403,
                errorCode: self::ERR_FORBIDDEN
            );
        }

        $user->loadMissing('vaiTro.quyens');

        return $this->successResponse(
            'Lấy thông tin người dùng thành công.',
            array_merge($this->formatUserPayload($user), [
                'expires_at' => $currentToken?->expires_at?->toIso8601String(),
            ])
        );
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            // 3. Thu hồi token hiện tại (hoặc toàn bộ token nếu truyền all_devices=true)
            if ($request->boolean('all_devices')) {
                $user->tokens()->delete();
            } else {
                $user->currentAccessToken()?->delete();
            }
        }

        return $this->successResponse('Đăng xuất và thu hồi phiên đăng nhập thành công.');
    }

    public function pingRole(Request $request): JsonResponse
    {
        /** @var NguoiDung $user */
        $user = $request->user()->loadMissing('vaiTro');
        $area = (string) $request->route('area', 'unknown');

        return $this->successResponse("Truy cập khu vực [{$area}] hợp lệ.", [
            'area'    => $area,
            'user_id' => $user->Ma_nguoi_dung,
            'ho_ten'  => $user->Ho_ten,
            'email'   => $user->Email,
            'role'    => strtolower((string) $user->vaiTro?->Ten_vai_tro),
        ]);
    }

    private function throttleKey(string $email, ?string $ip): string
    {
        return Str::transliterate(Str::lower(trim($email)) . '|' . ($ip ?? 'unknown'));
    }

    private function formatUserPayload(NguoiDung $user): array
    {
        return [
            'id'          => $user->Ma_nguoi_dung,
            'ho_ten'      => $user->Ho_ten,
            'email'       => $user->Email,
            'Trang_thai'  => $user->Trang_thai,
            'role'        => strtolower((string) $user->vaiTro?->Ten_vai_tro),
            'permissions' => $user->vaiTro?->quyens
                ->pluck('Ten_quyen')
                ->map(fn ($p) => strtolower((string) $p))
                ->values()
                ->all() ?? [],
        ];
    }
}