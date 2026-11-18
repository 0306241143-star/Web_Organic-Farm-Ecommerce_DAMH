<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChiTietFlashSale extends Model
{
    protected $table = 'chi_tiet_flash_sale';
    protected $primaryKey = 'Ma_ct_flash_sale';
    protected $guarded = [];

    public function flashSale(): BelongsTo
    {
        return $this->belongsTo(ChuongTrinhFlashSale::class, 'Ma_flash_sale', 'Ma_flash_sale');
    }

    public function loHang(): BelongsTo
    {
        return $this->belongsTo(LoHang::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }
}

