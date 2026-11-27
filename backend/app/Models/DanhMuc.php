<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DanhMuc extends Model
{
    // Model phân loại sản phẩm theo danh mục.
    protected $table = 'danh_muc';
    protected $primaryKey = 'Ma_danh_muc';
    // Cho phép ghi hàng loạt dữ liệu danh mục.
    protected $guarded = [];

    public function sanPhams(): HasMany
    {
        // Lấy toàn bộ sản phẩm thuộc danh mục.
        return $this->hasMany(SanPham::class, 'Ma_danh_muc', 'Ma_danh_muc');
    }
}

