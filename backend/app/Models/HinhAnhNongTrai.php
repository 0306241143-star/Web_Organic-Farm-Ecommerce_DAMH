<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HinhAnhNongTrai extends Model
{
    protected $table = 'hinh_anh_nong_trai';
    protected $primaryKey = 'Ma_hinh_anh';
    protected $guarded = [];

    public function nongTrai(): BelongsTo
    {
        return $this->belongsTo(NongTrai::class, 'Ma_nong_trai', 'Ma_nong_trai');
    }
}