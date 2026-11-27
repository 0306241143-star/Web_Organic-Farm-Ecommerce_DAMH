<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChiTietDonHang extends Model
{
    // Model lưu từng dòng sản phẩm trong đơn hàng.
    protected $table = 'Chi_tiet_don_hang';

    protected $primaryKey = 'Ma_ct_don_hang';

    // Cho phép ghi hàng loạt dữ liệu chi tiết đơn hàng.
    protected $guarded = [];

    public function sanPham(): BelongsTo
    {
        // Liên kết dòng đơn hàng với sản phẩm tương ứng.
        return $this->belongsTo(SanPham::class, 'Ma_san_pham', 'Ma_san_pham');
    }

    public function phanBoLoHangs(): HasMany
    {
        // Lấy các lần phân bổ lô hàng phục vụ dòng đơn hàng này.
        return $this->hasMany(PhanBoLoHang::class, 'Ma_ct_don_hang', 'Ma_ct_don_hang');
    }
}
