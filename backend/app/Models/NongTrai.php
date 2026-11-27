<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NongTrai extends Model
{
    // Model lưu thông tin nông trại và dữ liệu liên quan.
    protected $table = 'nong_trai';

    protected $primaryKey = 'Ma_nong_trai';

    // Cho phép ghi hàng loạt dữ liệu nông trại.
    protected $guarded = [];

    public function sanPhams(): HasMany
    {
        // Lấy các sản phẩm thuộc nguồn nông trại.
        return $this->hasMany(SanPham::class, 'Ma_nong_trai', 'Ma_nong_trai');
    }

    public function hinhAnhs(): HasMany
    {
        // Lấy ảnh nông trại theo thứ tự hiển thị và mã ảnh.
        return $this->hasMany(HinhAnhNongTrai::class, 'Ma_nong_trai', 'Ma_nong_trai')
            ->orderBy('Thu_tu')
            ->orderBy('Ma_hinh_anh');
    }

    public function ketQuaKiemDinhs(): HasMany
    {
        // Lấy toàn bộ kết quả kiểm định của nông trại.
        return $this->hasMany(KetQuaKiemDinh::class, 'Ma_nong_trai', 'Ma_nong_trai');
    }
}
