<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MuaVu extends Model
{
    protected $table = 'mua_vu';
    protected $primaryKey = 'Ma_mua_vu';
    protected $guarded = [];

    public function nongTrai(): BelongsTo
    {
        return $this->belongsTo(NongTrai::class, 'Ma_nong_trai', 'Ma_nong_trai');
    }

    public  function loCanhTacs(): HasMany
    {
        return $this->hasMany(LoCanhTac::class, 'Ma_mua_vu', 'Ma_mua_vu');
    }
}


