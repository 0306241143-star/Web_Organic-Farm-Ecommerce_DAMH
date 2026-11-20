<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChiTietGoi extends Model
{
    protected $table = 'Chi_tiet_goi';

    protected $primaryKey = 'Ma_ct_goi';

    protected $guarded = [];

    public function sanPham(): BelongsTo
    {
        return $this->belongsTo(SanPham::class, 'Ma_san_pham', 'Ma_san_pham');
    }
}
