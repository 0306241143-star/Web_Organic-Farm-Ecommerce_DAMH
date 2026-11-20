<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DonHang extends Model
{
    protected $table = 'don_hang';

    protected $primaryKey = 'Ma_don_hang';

    protected $guarded = [];

    public function chiTiets(): HasMany
    {
        return $this->hasMany(ChiTietDonHang::class, 'Ma_don_hang', 'Ma_don_hang');
    }

    public function diaChi(): BelongsTo
    {
        return $this->belongsTo(DiaChiGiaoHang::class, 'Ma_dia_chi', 'Ma_dia_chi');
    }

    public function thanhToans(): HasMany
    {
        return $this->hasMany(ThanhToan::class, 'Ma_don_hang', 'Ma_don_hang');
    }

    public function giaoHang(): HasOne
    {
        return $this->hasOne(GiaoHang::class, 'Ma_don_hang', 'Ma_don_hang');
    }

    public function dangKyGoi(): BelongsTo
    {
        return $this->belongsTo(DangKyGoi::class, 'Ma_dang_ky_goi', 'Ma_dang_ky');
    }
}
