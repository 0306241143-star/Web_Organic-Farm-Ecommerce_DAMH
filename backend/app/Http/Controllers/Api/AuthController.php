<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NguoiDung;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    use ApiResponse;

    public function ping(): JsonResponse
    {
        return $this->successResponse([
            'service'   => 'Nong San Sach API',
            'timestamp' => now()->toDateTimeString(),
        ], 'Kết nối React - Laravel API hoạt động ổn định.');
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required', 'string', 'min:6'],
        ], [
            'email.required'    => 'Vui lòng nhập địa chỉ email.',
            'email.email'       => 'Email không đúng định dạng.',
            'password.required' => 'Vui lòng nhập mật khẩu.',
            'password.min'      => 'Mật khẩu tối thiểu 6 ký tự.',
        ]);

        $user = NguoiDung::with('vaiTro.quyens')
            ->where('Email', $validated['email'])
            ->first();

        if (!$user || !Hash::check($validated['password'], $user->Mat_khau_ma_hoa)) {
            return $this->errorResponse(
                'Email hoặc mật khẩu không chính xác.',
                422,
                'VALIDATION_ERROR',
                ['email' => ['Thông tin đăng nhập không khớp với dữ liệu hệ thống.']]
            );
        }

        if ($user->Trang_thai === 'Khoa') {
            return $this->errorResponse('Tài khoản đã bị khóa.', 403, 'FORBIDDEN');
        }

        $token = $user->createToken('web-client')->plainTextToken;

        return $this->successResponse([
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => [
                'id'          => $user->Ma_nguoi_dung,
                'ho_ten'      => $user->Ho_ten,
                'email'       => $user->Email,
                'role'        => $user->vaiTro?->Ten_vai_tro,
                'permissions' => $user->vaiTro?->quyens->pluck('Ten_quyen')->values() ?? [],
            ],
        ], 'Đăng nhập thành công.');
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('vaiTro.quyens');

        return $this->successResponse([
            'id'          => $user->Ma_nguoi_dung,
            'ho_ten'      => $user->Ho_ten,
            'email'       => $user->Email,
            'role'        => $user->vaiTro?->Ten_vai_tro,
            'permissions' => $user->vaiTro?->quyens->pluck('Ten_quyen')->values() ?? [],
        ], 'Lấy thông tin phiên đăng nhập thành công.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return $this->successResponse(null, 'Đăng xuất thành công.');
    }
}