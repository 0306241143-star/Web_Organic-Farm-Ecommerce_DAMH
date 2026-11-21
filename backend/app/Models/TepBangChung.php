<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TepBangChung extends Model
{
    protected $table = 'Tep_bang_chung';

    protected $primaryKey = 'Ma_tep';

    protected $guarded = [];

    public function khieuNai(): BelongsTo
    {
        return $this->belongsTo(KhieuNai::class, 'Ma_khieu_nai', 'Ma_khieu_nai');
    }
}
