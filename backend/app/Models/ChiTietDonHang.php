<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChiTietDonHang extends Model
{
    protected $table = 'Chi_tiet_don_hang';

    protected $primaryKey = 'Ma_ct_don_hang';

    protected $guarded = [];

    public function sanPham(): BelongsTo
    {
        return $this->belongsTo(SanPham::class, 'Ma_san_pham', 'Ma_san_pham');
    }

    public function phanBoLoHangs(): HasMany
    {
        return $this->hasMany(PhanBoLoHang::class, 'Ma_ct_don_hang', 'Ma_ct_don_hang');
    }
}
