<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NhatKyCanhTac extends Model
{
    protected $table = 'nhat_ky_canh_tac';
    protected $primaryKey = 'Ma_nhat_ky';
    protected $guarded = [];

    protected $casts = [
        'Thoi_gian_thuc_hien' => 'datetime',
    ];

    public function loCanhTac(): BelongsTo
    {
        return $this->belongsTo(LoCanhTac::class, 'Ma_lo_canh_tac', 'Ma_lo_canh_tac');
    }

    public function nhanVien(): BelongsTo
    {
        return $this->belongsTo(NguoiDung::class, 'Ma_nhan_vien', 'Ma_nguoi_dung');
    }

    public function tepNhatKys(): HasMany
    {
        return $this->hasMany(TepNhatKy::class, 'Ma_nhat_ky', 'Ma_nhat_ky');
    }
}


