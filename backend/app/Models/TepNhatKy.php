<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TepNhatKy extends Model
{
    // Model lưu tệp đính kèm cho nhật ký canh tác.
    protected $table = 'tep_nhat_ky';
    protected $primaryKey = 'Ma_tep';
    // Cho phép ghi hàng loạt dữ liệu tệp nhật ký.
    protected $guarded = [];

    public function nhatKy(): BelongsTo
    {
        // Liên kết tệp với nhật ký canh tác chứa nó.
        return $this->belongsTo(NhatKyCanhTac::class, 'Ma_nhat_ky', 'Ma_nhat_ky');
    }
}


