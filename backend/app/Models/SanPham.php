<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SanPham extends Model
{
    protected $table = 'san_pham';
    protected $primaryKey = 'Ma_san_pham';
    protected $guarded = [];

    public function danhMuc(): BelongsTo
    {
        return $this->belongsTo(DanhMuc::class, 'Ma_danh_muc', 'Ma_danh_muc');
    }

    public function loCanhTacs(): HasMany
    {
        return $this->hasMany(LoCanhTac::class, 'Ma_san_pham', 'Ma_san_pham');
    }
}

