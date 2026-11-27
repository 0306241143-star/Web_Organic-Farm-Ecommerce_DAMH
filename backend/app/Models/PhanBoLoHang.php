<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PhanBoLoHang extends Model
{
    // Model ghi nhận việc phân bổ lô hàng cho chi tiết đơn hàng.
    protected $table = 'Phan_bo_lo_hang';
    protected $primaryKey = 'Ma_phan_bo';
    // Cho phép ghi hàng loạt dữ liệu phân bổ.
    protected $guarded = [];

    public function loHang(): BelongsTo
    {
        // Liên kết phân bổ với lô hàng được lấy.
        return $this->belongsTo(LoHang::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }
}

