<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HinhAnhSanPham extends Model
{
    protected $table = 'hinh_anh_san_pham';

    protected $primaryKey = 'Ma_hinh_anh';

    protected $fillable = [
        'Ma_san_pham',
        'Duong_dan',
        'Thu_tu',
        'La_anh_chinh',
    ];

    protected $casts = [
        'La_anh_chinh' => 'boolean',
        'Thu_tu' => 'integer',
    ];

    public function sanPham(): BelongsTo
    {
        return $this->belongsTo(SanPham::class, 'Ma_san_pham', 'Ma_san_pham');
    }
}