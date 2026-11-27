<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChiTietGioHang extends Model
{
    // Model lưu từng sản phẩm cùng số lượng trong giỏ hàng.
    protected $table = 'Chi_tiet_gio_hang';

    protected $primaryKey = 'Ma_ct_gio_hang';

    // Cho phép ghi hàng loạt dữ liệu dòng giỏ hàng.
    protected $guarded = [];

    public function sanPham(): BelongsTo
    {
        // Liên kết dòng giỏ hàng với sản phẩm được thêm.
        return $this->belongsTo(SanPham::class, 'Ma_san_pham', 'Ma_san_pham');
    }
}
