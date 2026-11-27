<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DiemTichLuy extends Model
{
    // Model ghi nhận từng giao dịch cộng hoặc trừ điểm tích lũy.
    protected $table = 'Diem_tich_luy';
    protected $primaryKey = 'Ma_gd_diem';
    // Cho phép ghi hàng loạt dữ liệu giao dịch điểm.
    protected $guarded = [];
}

