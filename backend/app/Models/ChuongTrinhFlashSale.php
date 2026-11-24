<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChuongTrinhFlashSale extends Model
{
    protected $table = 'chuong_trinh_flash_sale';
    protected $primaryKey = 'Ma_flash_sale';
    protected $guarded = [];

    public function chiTietFlashSales(): HasMany
    {
        return $this->hasMany(ChiTietFlashSale::class, 'Ma_flash_sale', 'Ma_flash_sale');
    }

    public function nhanVienTao(): BelongsTo
    {
        return $this->belongsTo(NguoiDung::class, 'Ma_sales_tao', 'Ma_nguoi_dung');
    }
}

