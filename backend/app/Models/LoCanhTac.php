<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoCanhTac extends Model
{
    protected $table = 'lo_canh_tac';
    protected $primaryKey = 'Ma_lo_canh_tac';
    protected $guarded = [];

    public function muaVu(): BelongsTo
    {
        return $this->belongsTo(MuaVu::class, 'Ma_mua_vu', 'Ma_mua_vu');
    }

    public function sanPham(): BelongsTo
    {
        return $this->belongsTo(SanPham::class, 'Ma_san_pham', 'Ma_san_pham');
    }

    public function nhatKyCanhTacs(): HasMany
    {
        return $this->hasMany(NhatKyCanhTac::class, 'Ma_lo_canh_tac', 'Ma_lo_canh_tac');
    }

    public function loHangs(): HasMany
    {
        return $this->hasMany(LoHang::class, 'Ma_lo_canh_tac', 'Ma_lo_canh_tac');
    }
}


