<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ThanhToan extends Model
{
    // Model ghi nhận giao dịch thanh toán của đơn hàng.
    protected $table = 'Thanh_toan';
    protected $primaryKey = 'Ma_thanh_toan';
    // Cho phép ghi hàng loạt dữ liệu thanh toán.
    protected $guarded = [];
}

