<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class KhieuNai extends Model
{
    protected $table = 'khieu_nai';

    protected $primaryKey = 'Ma_khieu_nai';

    protected $guarded = [];

    public function donHang(): BelongsTo
    {
        return $this->belongsTo(DonHang::class, 'Ma_don_hang', 'Ma_don_hang');
    }

    public function tepBangChungs(): HasMany
    {
        return $this->hasMany(TepBangChung::class, 'Ma_khieu_nai', 'Ma_khieu_nai');
    }

    public function nhanVienXuLy(): BelongsTo
    {
        return $this->belongsTo(NguoiDung::class, 'Ma_nhan_vien_xu_ly', 'Ma_nguoi_dung');
    }

    public function hoanTien(): HasOne
    {
        return $this->hasOne(HoanTien::class, 'Ma_khieu_nai', 'Ma_khieu_nai');
    }
}