<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChiTietGoi extends Model
{
    // Model liên kết sản phẩm với gói đăng ký định kỳ.
    protected $table = 'Chi_tiet_goi';

    protected $primaryKey = 'Ma_ct_goi';

    // Cho phép ghi hàng loạt dữ liệu thành phần gói.
    protected $guarded = [];

    public function sanPham(): BelongsTo
    {
        // Liên kết thành phần gói với sản phẩm cụ thể.
        return $this->belongsTo(SanPham::class, 'Ma_san_pham', 'Ma_san_pham');
    }
}
