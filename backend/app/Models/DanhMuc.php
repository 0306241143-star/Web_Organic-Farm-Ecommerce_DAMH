<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DanhMuc extends Model
{
    protected $table = 'danh_muc';
    protected $primaryKey = 'Ma_danh_muc';
    protected $guarded = [];

    public function sanPhams(): HasMany
    {
        return $this->hasMany(SanPham::class, 'Ma_danh_muc', 'Ma_danh_muc');
    }
}

