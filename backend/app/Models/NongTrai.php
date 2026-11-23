<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NongTrai extends Model
{
    protected $table = 'nong_trai';
    protected $primaryKey = 'Ma_nong_trai';
    protected $guarded = [];

    public function sanPhams(): HasMany
    {
        return $this->hasMany(SanPham::class, 'Ma_nong_trai', 'Ma_nong_trai');
    }

    public function hinhAnhs(): HasMany
    {
        return $this->hasMany(HinhAnhNongTrai::class, 'Ma_nong_trai', 'Ma_nong_trai')
            ->orderBy('Thu_tu')
            ->orderBy('Ma_hinh_anh');
    }
}