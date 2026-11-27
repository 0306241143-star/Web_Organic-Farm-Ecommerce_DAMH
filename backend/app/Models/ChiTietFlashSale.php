<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChiTietFlashSale extends Model
{
    // Model lưu lô hàng tham gia và mức ưu đãi trong Flash Sale.
    protected $table = 'chi_tiet_flash_sale';
    protected $primaryKey = 'Ma_ct_flash_sale';
    // Cho phép ghi hàng loạt dữ liệu chi tiết Flash Sale.
    protected $guarded = [];

    public function flashSale(): BelongsTo
    {
        // Liên kết dòng chi tiết với chiến dịch Flash Sale.
        return $this->belongsTo(ChuongTrinhFlashSale::class, 'Ma_flash_sale', 'Ma_flash_sale');
    }

    public function loHang(): BelongsTo
    {
        // Liên kết dòng chi tiết với lô hàng áp dụng.
        return $this->belongsTo(LoHang::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }
}

