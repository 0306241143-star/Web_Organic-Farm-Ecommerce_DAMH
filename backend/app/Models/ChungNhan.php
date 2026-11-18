<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChungNhan extends Model
{
    protected $table = 'chung_nhan';
    protected $primaryKey = 'Ma_chung_nhan';
    protected $guarded = [];

    public function loHang(): BelongsTo
    {
        return $this->belongsTo(LoHang::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function sanPham(): BelongsTo
    {
        return $this->belongsTo(SanPham::class, 'Ma_san_pham', 'Ma_san_pham');
    }
}
