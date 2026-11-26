<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GiaoHang extends Model
{
    protected $table = 'giao_hang';

    protected $primaryKey = 'Ma_giao_hang';

    protected $guarded = [];

    public function donHang(): BelongsTo
    {
        return $this->belongsTo(DonHang::class, 'Ma_don_hang', 'Ma_don_hang');
    }

    public function nhanVienDieuPhoi(): BelongsTo
    {
        return $this->belongsTo(NguoiDung::class, 'Ma_nhan_vien_dieu_phoi', 'Ma_nguoi_dung');
    }
}