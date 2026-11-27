<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GiaoHang extends Model
{
    // Model theo dõi trạng thái giao hàng và nhân viên điều phối.
    protected $table = 'giao_hang';

    protected $primaryKey = 'Ma_giao_hang';

    // Cho phép ghi hàng loạt dữ liệu giao hàng.
    protected $guarded = [];

    public function donHang(): BelongsTo
    {
        // Liên kết chuyến giao với đơn hàng được giao.
        return $this->belongsTo(DonHang::class, 'Ma_don_hang', 'Ma_don_hang');
    }

    public function nhanVienDieuPhoi(): BelongsTo
    {
        // Liên kết chuyến giao với nhân viên điều phối.
        return $this->belongsTo(NguoiDung::class, 'Ma_nhan_vien_dieu_phoi', 'Ma_nguoi_dung');
    }
}