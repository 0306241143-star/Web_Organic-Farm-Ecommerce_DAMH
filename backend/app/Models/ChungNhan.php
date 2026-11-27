<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChungNhan extends Model
{
    // Model lưu chứng nhận chất lượng gắn với lô hoặc sản phẩm.
    protected $table = 'chung_nhan';
    protected $primaryKey = 'Ma_chung_nhan';
    // Cho phép ghi hàng loạt dữ liệu chứng nhận.
    protected $guarded = [];

    public function loHang(): BelongsTo
    {
        // Liên kết chứng nhận với lô hàng được kiểm tra.
        return $this->belongsTo(LoHang::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function sanPham(): BelongsTo
    {
        // Liên kết chứng nhận với loại sản phẩm tương ứng.
        return $this->belongsTo(SanPham::class, 'Ma_san_pham', 'Ma_san_pham');
    }
}
