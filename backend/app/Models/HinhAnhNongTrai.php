<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HinhAnhNongTrai extends Model
{
    // Model lưu các hình ảnh trình bày nông trại.
    protected $table = 'hinh_anh_nong_trai';
    protected $primaryKey = 'Ma_hinh_anh';
    // Cho phép ghi hàng loạt dữ liệu hình ảnh.
    protected $guarded = [];

    public function nongTrai(): BelongsTo
    {
        // Liên kết ảnh với nông trại được trình bày.
        return $this->belongsTo(NongTrai::class, 'Ma_nong_trai', 'Ma_nong_trai');
    }
}