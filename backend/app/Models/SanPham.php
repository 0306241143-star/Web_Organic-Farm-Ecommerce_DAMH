<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class SanPham extends Model
{
    protected $table = 'san_pham';
    protected $primaryKey = 'Ma_san_pham';
    protected $guarded = [];

    public function danhMuc(): BelongsTo
    {
        return $this->belongsTo(DanhMuc::class, 'Ma_danh_muc', 'Ma_danh_muc');
    }

    public function nongTrai(): BelongsTo
    {
        return $this->belongsTo(NongTrai::class, 'Ma_nong_trai', 'Ma_nong_trai');
    }

    public function loCanhTacs(): HasMany
    {
        return $this->hasMany(LoCanhTac::class, 'Ma_san_pham', 'Ma_san_pham');
    }

    public function chungNhans(): HasMany
    {
        return $this->hasMany(ChungNhan::class, 'Ma_san_pham', 'Ma_san_pham');
    }

    public function loHangs(): HasManyThrough
    {
        return $this->hasManyThrough(
            LoHang::class,
            LoCanhTac::class,
            'Ma_san_pham',
            'Ma_lo_canh_tac',
            'Ma_san_pham',
            'Ma_lo_canh_tac'
        );
    }

    public function hinhAnhs(): HasMany
    {
        return $this->hasMany(HinhAnhSanPham::class, 'Ma_san_pham', 'Ma_san_pham')
            ->orderByDesc('La_anh_chinh')
            ->orderBy('Thu_tu')
            ->orderBy('Ma_hinh_anh');
    }
}

