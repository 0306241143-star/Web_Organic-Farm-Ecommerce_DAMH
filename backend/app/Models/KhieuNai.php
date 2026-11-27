<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class KhieuNai extends Model
{
    // Model quản lý khiếu nại của khách hàng về đơn hàng.
    protected $table = 'khieu_nai';

    protected $primaryKey = 'Ma_khieu_nai';

    // Cho phép ghi hàng loạt dữ liệu khiếu nại.
    protected $guarded = [];

    public function donHang(): BelongsTo
    {
        // Liên kết khiếu nại với đơn hàng bị phản ánh.
        return $this->belongsTo(DonHang::class, 'Ma_don_hang', 'Ma_don_hang');
    }

    public function tepBangChungs(): HasMany
    {
        // Lấy các tệp bằng chứng đính kèm khiếu nại.
        return $this->hasMany(TepBangChung::class, 'Ma_khieu_nai', 'Ma_khieu_nai');
    }

    public function nhanVienXuLy(): BelongsTo
    {
        // Liên kết khiếu nại với nhân viên xử lý.
        return $this->belongsTo(NguoiDung::class, 'Ma_nhan_vien_xu_ly', 'Ma_nguoi_dung');
    }

    public function hoanTien(): HasOne
    {
        // Lấy bản ghi hoàn tiền nếu khiếu nại đã được duyệt.
        return $this->hasOne(HoanTien::class, 'Ma_khieu_nai', 'Ma_khieu_nai');
    }
}