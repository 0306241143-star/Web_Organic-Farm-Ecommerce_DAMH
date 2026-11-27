<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GioHang extends Model
{
    // Model đại diện cho giỏ hàng của người dùng.
    protected $table = 'Gio_hang';

    protected $primaryKey = 'Ma_gio_hang';

    // Cho phép ghi hàng loạt dữ liệu giỏ hàng.
    protected $guarded = [];

    public function chiTiets(): HasMany
    {
        // Lấy các dòng sản phẩm đang có trong giỏ.
        return $this->hasMany(ChiTietGioHang::class, 'Ma_gio_hang', 'Ma_gio_hang');
    }
}
