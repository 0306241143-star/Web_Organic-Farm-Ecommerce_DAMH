<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhanBoLoHang extends Model
{
    protected $table = 'Phan_bo_lo_hang';
    protected $primaryKey = 'Ma_phan_bo';
    protected $guarded = [];

    public function loHang(): BelongsTo
    {
        return $this->belongsTo(LoHang::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }
}

