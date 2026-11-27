<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class SanPham extends Model
{
    // Model trung tâm lưu sản phẩm, danh mục và nguồn gốc canh tác.
    protected $table = 'san_pham';
    protected $primaryKey = 'Ma_san_pham';
    // Cho phép ghi hàng loạt dữ liệu sản phẩm.
    protected $guarded = [];

    public function danhMuc(): BelongsTo
    {
        // Liên kết sản phẩm với danh mục phân loại.
        return $this->belongsTo(DanhMuc::class, 'Ma_danh_muc', 'Ma_danh_muc');
    }

    public function nongTrai(): BelongsTo
    {
        // Liên kết sản phẩm với nông trại cung ứng.
        return $this->belongsTo(NongTrai::class, 'Ma_nong_trai', 'Ma_nong_trai');
    }

    public function loCanhTacs(): HasMany
    {
        // Lấy các lô canh tác tạo ra sản phẩm.
        return $this->hasMany(LoCanhTac::class, 'Ma_san_pham', 'Ma_san_pham');
    }

    public function chungNhans(): HasMany
    {
        // Lấy các chứng nhận của sản phẩm.
        return $this->hasMany(ChungNhan::class, 'Ma_san_pham', 'Ma_san_pham');
    }

    public function loHangs(): HasManyThrough
    {
        // Truy vấn lô hàng gián tiếp qua lô canh tác của sản phẩm.
        return $this->hasManyThrough(
            LoHang::class,
            LoCanhTac::class,
            'Ma_san_pham',
            'Ma_lo_canh_tac',
            'Ma_san_pham',
            'Ma_lo_canh_tac'
        );
    }

    public function hinhAnhs(): HasMany
    {
        // Lấy ảnh theo ảnh chính, thứ tự hiển thị rồi mã ảnh.
        return $this->hasMany(HinhAnhSanPham::class, 'Ma_san_pham', 'Ma_san_pham')
            ->orderByDesc('La_anh_chinh')
            ->orderBy('Thu_tu')
            ->orderBy('Ma_hinh_anh');
    }
}

