<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoCanhTac extends Model
{
    // Model đại diện cho một lô canh tác trong mùa vụ.
    protected $table = 'lo_canh_tac';
    protected $primaryKey = 'Ma_lo_canh_tac';
    // Cho phép ghi hàng loạt dữ liệu lô canh tác.
    protected $guarded = [];

    public function muaVu(): BelongsTo
    {
        // Liên kết lô canh tác với mùa vụ đang thực hiện.
        return $this->belongsTo(MuaVu::class, 'Ma_mua_vu', 'Ma_mua_vu');
    }

    public function sanPham(): BelongsTo
    {
        // Liên kết lô canh tác với loại sản phẩm trồng.
        return $this->belongsTo(SanPham::class, 'Ma_san_pham', 'Ma_san_pham');
    }

    public function nhatKyCanhTacs(): HasMany
    {
        // Lấy toàn bộ nhật ký hoạt động của lô canh tác.
        return $this->hasMany(NhatKyCanhTac::class, 'Ma_lo_canh_tac', 'Ma_lo_canh_tac');
    }

    public function latestNhatKyCanhTac(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        // Lấy duy nhất nhật ký mới nhất theo thời gian thực hiện.
        return $this->hasOne(NhatKyCanhTac::class, 'Ma_lo_canh_tac', 'Ma_lo_canh_tac')->latestOfMany('Thoi_gian_thuc_hien');
    }

    public function loHangs(): HasMany
    {
        // Lấy các lô hàng thu hoạch từ lô canh tác.
        return $this->hasMany(LoHang::class, 'Ma_lo_canh_tac', 'Ma_lo_canh_tac');
    }
}


