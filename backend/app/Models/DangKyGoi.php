<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DangKyGoi extends Model
{
    protected $table = 'dang_ky_goi';

    protected $primaryKey = 'Ma_dang_ky';

    protected $guarded = [];

    public function goi(): BelongsTo
    {
        return $this->belongsTo(GoiDinhKy::class, 'Ma_goi', 'Ma_goi');
    }

    public function diaChi(): BelongsTo
    {
        return $this->belongsTo(DiaChiGiaoHang::class, 'Ma_dia_chi', 'Ma_dia_chi');
    }

    public function lichGiao(): HasMany
    {
        return $this->hasMany(LichGiaoDinhKy::class, 'Ma_dang_ky', 'Ma_dang_ky');
    }

    public function donHangs(): HasMany
    {
        return $this->hasMany(DonHang::class, 'Ma_dang_ky_goi', 'Ma_dang_ky');
    }
}
