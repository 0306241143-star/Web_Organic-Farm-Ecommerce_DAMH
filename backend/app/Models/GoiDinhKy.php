<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GoiDinhKy extends Model
{
    // Model định nghĩa gói mua hàng theo chu kỳ.
    protected $table = 'Goi_dinh_ky';

    protected $primaryKey = 'Ma_goi';

    // Cho phép ghi hàng loạt dữ liệu gói.
    protected $guarded = [];

    public function chiTiets(): HasMany
    {
        // Lấy các thành phần sản phẩm trong gói.
        return $this->hasMany(ChiTietGoi::class, 'Ma_goi', 'Ma_goi');
    }

    public function dangKyGois(): HasMany
    {
        // Lấy các đăng ký đang sử dụng gói.
        return $this->hasMany(DangKyGoi::class, 'Ma_goi', 'Ma_goi');
    }
}
