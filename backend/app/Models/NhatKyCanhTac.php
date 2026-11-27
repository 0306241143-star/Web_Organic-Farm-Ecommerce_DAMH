<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NhatKyCanhTac extends Model
{
    // Model ghi nhật ký hoạt động canh tác theo từng lô.
    protected $table = 'nhat_ky_canh_tac';
    protected $primaryKey = 'Ma_nhat_ky';
    // Cho phép ghi hàng loạt dữ liệu nhật ký.
    protected $guarded = [];

    // Tự động chuyển thời gian thực hiện sang đối tượng datetime.
    protected $casts = [
        'Thoi_gian_thuc_hien' => 'datetime',
    ];

    public function loCanhTac(): BelongsTo
    {
        // Liên kết nhật ký với lô canh tác được ghi.
        return $this->belongsTo(LoCanhTac::class, 'Ma_lo_canh_tac', 'Ma_lo_canh_tac');
    }

    public function nhanVien(): BelongsTo
    {
        // Liên kết nhật ký với nhân viên thực hiện.
        return $this->belongsTo(NguoiDung::class, 'Ma_nhan_vien', 'Ma_nguoi_dung');
    }

    public function tepNhatKys(): HasMany
    {
        // Lấy các tệp đính kèm của nhật ký canh tác.
        return $this->hasMany(TepNhatKy::class, 'Ma_nhat_ky', 'Ma_nhat_ky');
    }
}


