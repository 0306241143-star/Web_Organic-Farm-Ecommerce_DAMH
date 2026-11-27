<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TepBangChung extends Model
{
    // Model lưu tệp đính kèm bằng chứng cho khiếu nại.
    protected $table = 'Tep_bang_chung';

    protected $primaryKey = 'Ma_tep';

    // Cho phép ghi hàng loạt dữ liệu tệp bằng chứng.
    protected $guarded = [];

    public function khieuNai(): BelongsTo
    {
        // Liên kết tệp bằng chứng với khiếu nại sở hữu.
        return $this->belongsTo(KhieuNai::class, 'Ma_khieu_nai', 'Ma_khieu_nai');
    }
}
