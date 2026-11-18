<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChiTietGioHang extends Model
{
    protected $table = 'Chi_tiet_gio_hang';

    protected $primaryKey = 'Ma_ct_gio_hang';

    protected $guarded = [];

    public function sanPham(): BelongsTo
    {
        return $this->belongsTo(SanPham::class, 'Ma_san_pham', 'Ma_san_pham');
    }
}
