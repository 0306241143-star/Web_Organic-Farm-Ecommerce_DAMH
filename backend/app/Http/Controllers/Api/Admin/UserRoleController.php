<?php

/*
 * Luồng quản trị: quản lý tài khoản và phân quyền người dùng (CV04.28).
 */

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NguoiDung;
use App\Models\Quyen;
use App\Models\VaiTro;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class UserRoleController extends Controller
{
    use ApiResponse;

    /**
     * Danh sách mã quyền nhạy cảm liên quan đến doanh thu & dữ liệu khách hàng.
     * Bắt buộc cô lập khỏi vai trò Farm_Staff (Ma_vai_tro = 3).
     */
    private const FARM_STAFF_FORBIDDEN_PERMISSIONS = [
        'manage_users_roles',
        'view_admin_reports',
        'confirm_dispatch_order',
        'manage_flash_sale',
        'handle_complaints',
        'place_order_subscription',
    ];

    /**
     * GET /api/admin/users
     * Danh sách người dùng có lọc theo vai trò, trạng thái, từ khóa và phân trang.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = max(1, min(100, (int) $request->query('per_page', 15)));
        $roleId = $request->query('role_id');
        $status = $request->query('status');
        $search = trim((string) $request->query('search', ''));

        $query = NguoiDung::query()
            ->with('vaiTro.quyens')
            ->orderByRaw('CASE WHEN Ma_vai_tro IN (1, 2, 3) THEN 0 ELSE 1 END')
            ->orderByDesc('Ma_nguoi_dung');

        if ($roleId !== null && $roleId !== '' && $roleId !== 'ALL') {
            $query->where('Ma_vai_tro', (int) $roleId);
        }

        if ($status !== null && $status !== '' && $status !== 'ALL') {
            $query->where('Trang_thai', $status);
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('Ho_ten', 'like', "%{$search}%")
                  ->orWhere('Email', 'like', "%{$search}%")
                  ->orWhere('So_dien_thoai', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage);

        // Thống kê tổng quan phục vụ bộ lọc badge trên UI
        $summary = [
            'total'       => NguoiDung::count(),
            'active'      => NguoiDung::where('Trang_thai', 'Hoat_dong')->count(),
            'locked'      => NguoiDung::where('Trang_thai', 'Khoa')->count(),
            'staff_count' => NguoiDung::whereIn('Ma_vai_tro', [1, 2, 3])->count(),
        ];

        $items = collect($paginator->items())
            ->map(fn (NguoiDung $user) => $this->formatUser($user))
            ->values();

        return $this->successResponse(
            message: 'Lấy danh sách tài khoản thành công.',
            data: $items,
            meta: [
                'current_page' => $paginator->currentPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
                'last_page'    => $paginator->lastPage(),
                'summary'      => $summary,
            ]
        );
    }

    /**
     * POST /api/admin/users
     * Tạo mới tài khoản nhân viên (Farm Staff, Sales, Admin) hoặc khách hàng.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'Ho_ten'        => ['required', 'string', 'min:2', 'max:150'],
            'Email'         => ['required', 'string', 'email', 'max:150', 'unique:nguoi_dung,Email'],
            'So_dien_thoai' => ['nullable', 'string', 'regex:/^(0|\+84)[0-9]{8,11}$/', 'unique:nguoi_dung,So_dien_thoai'],
            'Ma_vai_tro'    => ['required', 'integer', 'exists:vai_tro,Ma_vai_tro'],
            'Mat_khau'      => ['required', 'string', 'min:6', 'max:100'],
            'Trang_thai'    => ['nullable', 'string', Rule::in(['Hoat_dong', 'Khoa'])],
        ], [
            'Ho_ten.required'        => 'Vui lòng nhập họ và tên người dùng.',
            'Email.required'         => 'Vui lòng nhập địa chỉ email.',
            'Email.email'            => 'Địa chỉ email không đúng định dạng.',
            'Email.unique'           => 'Email này đã được sử dụng cho một tài khoản khác.',
            'So_dien_thoai.regex'    => 'Số điện thoại Việt Nam không hợp lệ (VD: 0901234567).',
            'So_dien_thoai.unique'   => 'Số điện thoại này đã được đăng ký.',
            'Ma_vai_tro.required'    => 'Vui lòng chọn vai trò cho tài khoản.',
            'Ma_vai_tro.exists'      => 'Vai trò được chọn không tồn tại.',
            'Mat_khau.required'      => 'Vui lòng nhập mật khẩu khởi tạo.',
            'Mat_khau.min'           => 'Mật khẩu phải có ít nhất 6 ký tự.',
        ]);

        $user = NguoiDung::create([
            'Ma_vai_tro'      => (int) $validated['Ma_vai_tro'],
            'Ho_ten'          => trim($validated['Ho_ten']),
            'Email'           => Str::lower(trim($validated['Email'])),
            'So_dien_thoai'   => !empty($validated['So_dien_thoai']) ? trim($validated['So_dien_thoai']) : null,
            'Mat_khau_ma_hoa' => Hash::make($validated['Mat_khau']),
            'Trang_thai'      => $validated['Trang_thai'] ?? 'Hoat_dong',
        ]);

        $user->load('vaiTro.quyens');

        return $this->successResponse(
            message: 'Tạo tài khoản mới thành công.',
            data: $this->formatUser($user),
            status: 201
        );
    }

    /**
     * PUT /api/admin/users/{id}
     * Cập nhật thông tin, vai trò, mật khẩu (tùy chọn) và trạng thái tài khoản.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $user = NguoiDung::findOrFail($id);
        $currentAdmin = $request->user();

        $validated = $request->validate([
            'Ho_ten'        => ['required', 'string', 'min:2', 'max:150'],
            'Email'         => [
                'required',
                'string',
                'email',
                'max:150',
                Rule::unique('nguoi_dung', 'Email')->ignore($user->Ma_nguoi_dung, 'Ma_nguoi_dung'),
            ],
            'So_dien_thoai' => [
                'nullable',
                'string',
                'regex:/^(0|\+84)[0-9]{8,11}$/',
                Rule::unique('nguoi_dung', 'So_dien_thoai')->ignore($user->Ma_nguoi_dung, 'Ma_nguoi_dung'),
            ],
            'Ma_vai_tro'    => ['required', 'integer', 'exists:vai_tro,Ma_vai_tro'],
            'Mat_khau'      => ['nullable', 'string', 'min:6', 'max:100'],
            'Trang_thai'    => ['nullable', 'string', Rule::in(['Hoat_dong', 'Khoa'])],
        ], [
            'Ho_ten.required'      => 'Vui lòng nhập họ và tên.',
            'Email.unique'         => 'Email này đã thuộc về tài khoản khác.',
            'So_dien_thoai.regex'  => 'Số điện thoại không hợp lệ.',
            'So_dien_thoai.unique' => 'Số điện thoại này đã thuộc về tài khoản khác.',
            'Mat_khau.min'         => 'Mật khẩu mới phải có ít nhất 6 ký tự.',
        ]);

        // Bảo vệ tài khoản Admin gốc & ngăn Admin tự hạ quyền hoặc tự khóa chính mình
        if ((int) $user->Ma_nguoi_dung === (int) $currentAdmin->Ma_nguoi_dung) {
            if ((int) $validated['Ma_vai_tro'] !== 1) {
                return $this->errorResponse(
                    message: 'Không thể tự hạ vai trò Quản trị viên của chính tài khoản đang đăng nhập.',
                    status: 422,
                    errorCode: self::ERR_VALIDATION
                );
            }
            if (($validated['Trang_thai'] ?? $user->Trang_thai) === 'Khoa') {
                return $this->errorResponse(
                    message: 'Không thể tự khóa tài khoản Quản trị viên đang đăng nhập.',
                    status: 422,
                    errorCode: self::ERR_VALIDATION
                );
            }
        }

        if ($user->Email === 'admin@nongsansach.vn' && ((int) $validated['Ma_vai_tro'] !== 1 || ($validated['Trang_thai'] ?? 'Hoat_dong') === 'Khoa')) {
            return $this->errorResponse(
                message: 'Không thể khóa hoặc thay đổi vai trò của tài khoản Quản trị viên hệ thống gốc.',
                status: 422,
                errorCode: self::ERR_VALIDATION
            );
        }

        $roleChanged = (int) $user->Ma_vai_tro !== (int) $validated['Ma_vai_tro'];
        $nextStatus = $validated['Trang_thai'] ?? $user->Trang_thai;

        $user->Ho_ten = trim($validated['Ho_ten']);
        $user->Email = Str::lower(trim($validated['Email']));
        $user->So_dien_thoai = !empty($validated['So_dien_thoai']) ? trim($validated['So_dien_thoai']) : null;
        $user->Ma_vai_tro = (int) $validated['Ma_vai_tro'];
        $user->Trang_thai = $nextStatus;

        if (!empty($validated['Mat_khau'])) {
            $user->Mat_khau_ma_hoa = Hash::make($validated['Mat_khau']);
        }

        $user->save();

        // Nếu bị khóa hoặc đổi vai trò, thu hồi toàn bộ Sanctum token cũ để buộc đăng nhập lại với quyền mới
        if ($nextStatus === 'Khoa' || $roleChanged || !empty($validated['Mat_khau'])) {
            $user->tokens()->delete();
        }

        $user->load('vaiTro.quyens');

        return $this->successResponse(
            message: 'Cập nhật thông tin tài khoản thành công.',
            data: $this->formatUser($user)
        );
    }

    /**
     * PUT /api/admin/users/{id}/status
     * Khóa hoặc mở khóa nhanh tài khoản.
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user = NguoiDung::findOrFail($id);
        $currentAdmin = $request->user();

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['Hoat_dong', 'Khoa'])],
        ], [
            'status.required' => 'Vui lòng cung cấp trạng thái mới.',
            'status.in'       => 'Trạng thái không hợp lệ (chỉ chấp nhận Hoat_dong hoặc Khoa).',
        ]);

        if (
            $validated['status'] === 'Khoa' &&
            ((int) $user->Ma_nguoi_dung === (int) $currentAdmin->Ma_nguoi_dung || $user->Email === 'admin@nongsansach.vn')
        ) {
            return $this->errorResponse(
                message: 'Không thể khóa tài khoản Quản trị viên cao nhất hoặc tài khoản đang đăng nhập.',
                status: 422,
                errorCode: self::ERR_VALIDATION
            );
        }

        $user->Trang_thai = $validated['status'];
        $user->save();

        if ($validated['status'] === 'Khoa') {
            $user->tokens()->delete();
        }

        $user->load('vaiTro.quyens');

        return $this->successResponse(
            message: $validated['status'] === 'Khoa'
                ? "Đã khóa tài khoản \"{$user->Ho_ten}\"."
                : "Đã mở khóa tài khoản \"{$user->Ho_ten}\".",
            data: $this->formatUser($user)
        );
    }

    /**
     * GET /api/admin/roles-permissions
     * Lấy danh sách toàn bộ vai trò và danh mục quyền hệ thống để dựng ma trận phân quyền.
     */
    public function rolesAndPermissions(): JsonResponse
    {
        $roles = VaiTro::with('quyens')
            ->withCount('nguoiDungs as users_count')
            ->orderBy('Ma_vai_tro', 'asc')
            ->get()
            ->map(function (VaiTro $role) {
                return [
                    'id'          => (int) $role->Ma_vai_tro,
                    'code'        => $role->Ten_vai_tro,
                    'label'       => $this->mapRoleLabel((int) $role->Ma_vai_tro, $role->Ten_vai_tro),
                    'description' => $role->Mo_ta,
                    'users_count' => (int) ($role->users_count ?? 0),
                    'is_locked_role' => (int) $role->Ma_vai_tro === 1, // Admin luôn giữ toàn quyền
                    'permission_ids' => $role->quyens->pluck('Ma_quyen')->map(fn ($id) => (int) $id)->values(),
                    'permission_codes' => $role->quyens->pluck('Ten_quyen')->values(),
                ];
            })
            ->values();

        $permissions = Quyen::orderBy('Ma_quyen', 'asc')
            ->get()
            ->map(function (Quyen $perm) {
                $isSensitive = in_array($perm->Ten_quyen, self::FARM_STAFF_FORBIDDEN_PERMISSIONS, true);
                return [
                    'id'          => (int) $perm->Ma_quyen,
                    'code'        => $perm->Ten_quyen,
                    'description' => $perm->Mo_ta,
                    'group'       => $this->mapPermissionGroup($perm->Ten_quyen),
                    'is_sensitive_customer_or_revenue' => $isSensitive,
                ];
            })
            ->values();

        return $this->successResponse(
            message: 'Lấy cấu hình vai trò và phân quyền thành công.',
            data: [
                'roles'       => $roles,
                'permissions' => $permissions,
            ]
        );
    }

    /**
     * PUT /api/admin/roles/{roleId}/permissions
     * Cập nhật danh sách quyền được gán cho một vai trò.
     */
    public function updateRolePermissions(Request $request, int $roleId): JsonResponse
    {
        $role = VaiTro::findOrFail($roleId);

        if ((int) $role->Ma_vai_tro === 1) {
            return $this->errorResponse(
                message: 'Không thể chỉnh sửa hoặc thu hồi quyền của vai trò Quản trị viên (Admin).',
                status: 422,
                errorCode: self::ERR_VALIDATION
            );
        }

        $validated = $request->validate([
            'permission_ids'   => ['present', 'array'],
            'permission_ids.*' => ['integer', 'exists:quyen,Ma_quyen'],
        ], [
            'permission_ids.present' => 'Danh sách mã quyền không hợp lệ.',
            'permission_ids.*.exists' => 'Tồn tại mã quyền không hợp lệ trong hệ thống.',
        ]);

        $permissionIds = array_values(array_unique(array_map('intval', $validated['permission_ids'])));

        // Quy tắc nghiệp vụ cứng: Farm_Staff (Ma_vai_tro = 3) tuyệt đối không được gán quyền xem doanh thu hoặc thông tin khách hàng
        if ((int) $role->Ma_vai_tro === 3 && !empty($permissionIds)) {
            $violatedPerms = Quyen::whereIn('Ma_quyen', $permissionIds)
                ->whereIn('Ten_quyen', self::FARM_STAFF_FORBIDDEN_PERMISSIONS)
                ->pluck('Mo_ta')
                ->toArray();

            if (!empty($violatedPerms)) {
                return $this->errorResponse(
                    message: 'Vi phạm chính sách cô lập dữ liệu: Nhân viên Nông trại (Farm Staff) không được phép nhận các quyền liên quan đến doanh thu, đơn hàng hoặc thông tin khách hàng (' . implode(', ', $violatedPerms) . ').',
                    status: 422,
                    errorCode: self::ERR_VALIDATION
                );
            }
        }

        $role->quyens()->sync($permissionIds);
        $role->load('quyens')->loadCount('nguoiDungs as users_count');

        return $this->successResponse(
            message: "Đã cập nhật phân quyền cho vai trò \"{$role->Ten_vai_tro}\".",
            data: [
                'id'               => (int) $role->Ma_vai_tro,
                'code'             => $role->Ten_vai_tro,
                'label'            => $this->mapRoleLabel((int) $role->Ma_vai_tro, $role->Ten_vai_tro),
                'description'      => $role->Mo_ta,
                'users_count'      => (int) ($role->users_count ?? 0),
                'is_locked_role'   => false,
                'permission_ids'   => $role->quyens->pluck('Ma_quyen')->map(fn ($id) => (int) $id)->values(),
                'permission_codes' => $role->quyens->pluck('Ten_quyen')->values(),
            ]
        );
    }

    private function formatUser(NguoiDung $user): array
    {
        $roleId = (int) $user->Ma_vai_tro;
        $roleName = $user->vaiTro?->Ten_vai_tro ?? 'Customer';

        return [
            'id'           => (int) $user->Ma_nguoi_dung,
            'name'         => $user->Ho_ten,
            'email'        => $user->Email,
            'phone'        => $user->So_dien_thoai,
            'role_id'      => $roleId,
            'role_code'    => $roleName,
            'role_slug'    => $user->getRoleSlug(),
            'role_label'   => $this->mapRoleLabel($roleId, $roleName),
            'status'       => $user->Trang_thai,
            'status_label' => $user->Trang_thai === 'Hoat_dong' ? 'Hoạt động' : 'Đã khóa',
            'is_protected' => $user->Email === 'admin@nongsansach.vn',
            'permissions'  => $user->vaiTro?->quyens->pluck('Ten_quyen')->values() ?? [],
            'created_at'   => $user->created_at?->toISOString(),
        ];
    }

    private function mapRoleLabel(int $roleId, string $fallback): string
    {
        return match ($roleId) {
            1 => 'Quản trị viên (Admin)',
            2 => 'Nhân viên Bán hàng (Sales)',
            3 => 'Nhân viên Nông trại (Farm Staff)',
            4 => 'Khách hàng (Customer)',
            default => $fallback,
        };
    }

    private function mapPermissionGroup(string $code): string
    {
        return match (true) {
            in_array($code, ['manage_users_roles', 'view_admin_reports'], true) => 'Quản trị & Doanh thu',
            str_starts_with($code, 'manage_farm') || str_starts_with($code, 'manage_batch') || $code === 'manage_inventory_loss' => 'Vận hành Nông trại',
            in_array($code, ['confirm_dispatch_order', 'manage_flash_sale', 'handle_complaints'], true) => 'Bán hàng & Khách hàng',
            default => 'Cổng Khách hàng',
        };
    }
}