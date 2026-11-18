<?php

/*
 * Luồng quản trị: quản lý tài khoản và phân quyền người dùng (CV04.28).
 */

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NguoiDung;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserRoleController extends Controller
{
    use ApiResponse;

    /**
     * Danh sách tài khoản người dùng có phân trang và bộ lọc tìm kiếm.
     */
    public function index(Request $request): JsonResponse
    {
        $query = NguoiDung::with('vaiTro:Ma_vai_tro,Ten_vai_tro')
            ->select('Ma_nguoi_dung', 'Ma_vai_tro', 'Ho_ten', 'Email', 'So_dien_thoai', 'Trang_thai', 'created_at')
            ->latest('Ma_nguoi_dung');

        if ($request->filled('role')) {
            $roleSlug = $request->query('role');
            $roleMap = [
                'admin'      => 1,
                'sales'      => 2,
                'farm_staff' => 3,
                'customer'   => 4,
            ];
            if (isset($roleMap[$roleSlug])) {
                $query->where('Ma_vai_tro', $roleMap[$roleSlug]);
            }
        }

        if ($request->filled('status')) {
            $query->where('Trang_thai', $request->query('status'));
        }

        if ($request->filled('search')) {
            $keyword = trim($request->query('search'));
            $query->where(function ($q) use ($keyword) {
                $q->where('Ho_ten', 'like', "%{$keyword}%")
                    ->orWhere('Email', 'like', "%{$keyword}%")
                    ->orWhere('So_dien_thoai', 'like', "%{$keyword}%");
            });
        }

        $perPage = min((int) $request->query('per_page', 15), 50);
        $paginator = $query->paginate($perPage);

        return $this->paginatedResponse(
            message: 'Lấy danh sách tài khoản người dùng thành công.',
            paginator: $paginator
        );
    }

    /**
     * Cập nhật trạng thái khóa/mở khóa tài khoản người dùng.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:Hoat_dong,Khoa'],
        ], [
            'status.required' => 'Vui lòng chọn trạng thái tài khoản.',
            'status.in'       => 'Trạng thái chỉ có thể là Hoat_dong hoặc Khoa.',
        ]);

        $user = NguoiDung::findOrFail($id);

        if ($user->Ma_vai_tro === 1 && $validated['status'] === 'Khoa') {
            return $this->errorResponse(
                message: 'Không thể tạm khóa tài khoản Quản trị viên cấp cao nhất.',
                status: 422,
                errorCode: self::ERR_VALIDATION
            );
        }

        $user->Trang_thai = $validated['status'];
        $user->save();

        // Nếu bị khóa, thu hồi token ngay lập tức
        if ($validated['status'] === 'Khoa') {
            $user->tokens()->delete();
        }

        return $this->successResponse(
            message: $validated['status'] === 'Khoa'
                ? 'Đã khóa tài khoản thành công.'
                : 'Đã mở khóa tài khoản thành công.',
            data: [
                'id'     => $user->Ma_nguoi_dung,
                'status' => $user->Trang_thai,
            ]
        );
    }
}
