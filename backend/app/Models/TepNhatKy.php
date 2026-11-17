<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TepNhatKy extends Model
{
    protected $table = 'tep_nhat_ky';
    protected $primaryKey = 'Ma_tep';
    protected $guarded = [];

    public function nhatKy(): BelongsTo
    {
        return $this->belongsTo(NhatKyCanhTac::class, 'Ma_nhat_ky', 'Ma_nhat_ky');
    }
}


