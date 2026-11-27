<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BienDongKho extends Model
{
    // Model lưu lịch sử nhập, xuất và điều chỉnh tồn kho.
    protected $table = 'bien_dong_kho';
    protected $primaryKey = 'Ma_bien_dong';
    // Cho phép ghi hàng loạt toàn bộ trường biến động kho.
    protected $guarded = [];

    public function loHang(): BelongsTo
    {
        // Liên kết biến động với lô hàng chịu tác động.
        return $this->belongsTo(LoHang::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function nhanVien(): BelongsTo
    {
        // Liên kết biến động với nhân viên ghi nhận.
        return $this->belongsTo(NguoiDung::class, 'Ma_nhan_vien', 'Ma_nguoi_dung');
    }
}
