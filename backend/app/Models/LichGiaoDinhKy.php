<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LichGiaoDinhKy extends Model
{
    // Model lưu từng lịch giao hàng của đăng ký gói.
    protected $table = 'Lich_giao_dinh_ky';
    protected $primaryKey = 'Ma_lich_giao';
    // Cho phép ghi hàng loạt dữ liệu lịch giao.
    protected $guarded = [];
}

