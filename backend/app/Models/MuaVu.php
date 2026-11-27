<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MuaVu extends Model
{
    // Model quản lý mùa vụ canh tác của nông trại.
    protected $table = 'mua_vu';
    protected $primaryKey = 'Ma_mua_vu';
    // Cho phép ghi hàng loạt dữ liệu mùa vụ.
    protected $guarded = [];

    public function nongTrai(): BelongsTo
    {
        // Liên kết mùa vụ với nông trại thực hiện.
        return $this->belongsTo(NongTrai::class, 'Ma_nong_trai', 'Ma_nong_trai');
    }

    public function loCanhTacs(): HasMany
    {
        // Lấy toàn bộ lô canh tác trong mùa vụ.
        return $this->hasMany(LoCanhTac::class, 'Ma_mua_vu', 'Ma_mua_vu');
    }
}


