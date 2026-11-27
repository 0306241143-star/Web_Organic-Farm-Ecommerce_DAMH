<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DangKyGoi extends Model
{
    // Model lưu đăng ký mua gói định kỳ của khách hàng.
    protected $table = 'dang_ky_goi';

    protected $primaryKey = 'Ma_dang_ky';

    // Cho phép ghi hàng loạt dữ liệu đăng ký gói.
    protected $guarded = [];

    public function goi(): BelongsTo
    {
        // Liên kết đăng ký với gói định kỳ đã chọn.
        return $this->belongsTo(GoiDinhKy::class, 'Ma_goi', 'Ma_goi');
    }

    public function diaChi(): BelongsTo
    {
        // Liên kết đăng ký với địa chỉ giao hàng đã chọn.
        return $this->belongsTo(DiaChiGiaoHang::class, 'Ma_dia_chi', 'Ma_dia_chi');
    }

    public function lichGiao(): HasMany
    {
        // Lấy toàn bộ lịch giao được sinh từ đăng ký.
        return $this->hasMany(LichGiaoDinhKy::class, 'Ma_dang_ky', 'Ma_dang_ky');
    }

    public function donHangs(): HasMany
    {
        // Lấy các đơn hàng phát sinh từ đăng ký gói.
        return $this->hasMany(DonHang::class, 'Ma_dang_ky_goi', 'Ma_dang_ky');
    }
}
