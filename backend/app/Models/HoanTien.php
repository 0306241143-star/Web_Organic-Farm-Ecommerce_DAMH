<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HoanTien extends Model
{
    // Model ghi nhận kết quả hoàn tiền cho khiếu nại.
    protected $table = 'Hoan_tien';
    protected $primaryKey = 'Ma_hoan_tien';
    // Cho phép ghi hàng loạt dữ liệu hoàn tiền.
    protected $guarded = [];
}

