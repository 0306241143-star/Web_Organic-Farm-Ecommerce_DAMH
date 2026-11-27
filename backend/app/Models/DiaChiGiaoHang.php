<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiaChiGiaoHang extends Model
{
    // Model lưu địa chỉ nhận hàng của người dùng.
    protected $table = 'Dia_chi_giao_hang';
    protected $primaryKey = 'Ma_dia_chi';
    // Cho phép ghi hàng loạt dữ liệu địa chỉ.
    protected $guarded = [];
}

