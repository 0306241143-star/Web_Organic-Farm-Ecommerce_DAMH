<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaQrTruyXuat extends Model
{
    protected $table = 'ma_qr_truy_xuat';
    protected $primaryKey = 'Ma_qr';
    protected $guarded = [];

    public function loHang(): BelongsTo
    {
        return $this->belongsTo(LoHang::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function nhanVienTao(): BelongsTo
    {
        return $this->belongsTo(NguoiDung::class, 'Ma_nhan_vien_tao', 'Ma_nguoi_dung');
    }
}
