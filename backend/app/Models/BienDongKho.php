<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BienDongKho extends Model
{
    protected $table = 'bien_dong_kho';
    protected $primaryKey = 'Ma_bien_dong';
    protected $guarded = [];

    public function loHang(): BelongsTo
    {
        return $this->belongsTo(LoHang::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function nhanVien(): BelongsTo
    {
        return $this->belongsTo(NguoiDung::class, 'Ma_nhan_vien', 'Ma_nguoi_dung');
    }
}
