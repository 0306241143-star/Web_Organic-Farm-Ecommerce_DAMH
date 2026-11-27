<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChuongTrinhFlashSale extends Model
{
    // Model quản lý thông tin và thời gian chiến dịch Flash Sale.
    protected $table = 'chuong_trinh_flash_sale';
    protected $primaryKey = 'Ma_flash_sale';
    // Cho phép ghi hàng loạt dữ liệu chiến dịch.
    protected $guarded = [];

    public function chiTietFlashSales(): HasMany
    {
        // Lấy các dòng lô hàng được đưa vào chiến dịch.
        return $this->hasMany(ChiTietFlashSale::class, 'Ma_flash_sale', 'Ma_flash_sale');
    }

    public function nhanVienTao(): BelongsTo
    {
        // Liên kết chiến dịch với nhân viên sales tạo ra.
        return $this->belongsTo(NguoiDung::class, 'Ma_sales_tao', 'Ma_nguoi_dung');
    }
}

