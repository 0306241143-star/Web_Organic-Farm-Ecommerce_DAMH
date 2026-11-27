<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Notifications\QueuedResetPasswordNotification;

class NguoiDung extends Authenticatable
{
    // Model người dùng dùng chung cho xác thực, phân quyền và đặt lại mật khẩu.
    use HasApiTokens, Notifiable;

    protected $table = 'nguoi_dung';
    protected $primaryKey = 'Ma_nguoi_dung';
    // Cho phép ghi hàng loạt dữ liệu người dùng.
    protected $guarded = [];

    // Không trả mật khẩu mã hóa ra ngoài dữ liệu serialization.
    protected $hidden = [
        'Mat_khau_ma_hoa',
    ];

    public function getAuthPassword(): string
    {
        // Cung cấp trường mật khẩu cho cơ chế xác thực Laravel.
        return $this->Mat_khau_ma_hoa;
    }

    public function getAuthPasswordName(): string
    {
        // Khai báo tên cột mật khẩu dùng trong xác thực.
        return 'Mat_khau_ma_hoa';
    }

    public function getRememberTokenName(): string
    {
        // Không dùng remember-token nên trả tên cột rỗng.
        return '';
    }

    public function getEmailForPasswordReset(): string
    {
        // Cung cấp email nhận liên kết đặt lại mật khẩu.
        return $this->Email;
    }

    public function routeNotificationForMail(): string
    {
        // Định tuyến thông báo reset mật khẩu qua email người dùng.
        return $this->Email;
    }

    public function vaiTro()
    {
        // Liên kết người dùng với vai trò phân quyền.
        return $this->belongsTo(VaiTro::class, 'Ma_vai_tro', 'Ma_vai_tro');
    }

    public function hasPermission(string $tenQuyen): bool
    {
        // Kiểm tra vai trò hiện tại có quyền tên đã yêu cầu hay không.
        return $this->vaiTro?->quyens()->where('Ten_quyen', $tenQuyen)->exists() ?? false;
    }

    public function getRoleSlug(): string
    {
        // Ánh xạ mã vai trò sang slug dùng cho kiểm tra phân quyền.
        return match ((int) $this->Ma_vai_tro) {
            1 => 'admin',
            2 => 'sales',
            3 => 'farm_staff',
            default => 'customer',
        };
    }

    public function hasRole(string|array $roles): bool
    {
        // Chuẩn hóa danh sách slug rồi kiểm tra vai trò hiện tại.
        $currentRole = $this->getRoleSlug();
        if (is_array($roles)) {
            $normalized = array_map(fn($r) => strtolower(trim($r)), $roles);
            return in_array($currentRole, $normalized, true);
        }

        return $currentRole === strtolower(trim($roles));
    }

    // Thêm vào bên trong class NguoiDung:
    public function sendPasswordResetNotification($token): void
    {
        // Gửi reset mật khẩu qua notification hỗ trợ hàng đợi.
        $this->notify(new QueuedResetPasswordNotification($token));
    }
}
