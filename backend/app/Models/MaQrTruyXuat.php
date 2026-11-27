<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaQrTruyXuat extends Model
{
    // Model lưu mã QR truy xuất nguồn gốc theo lô hàng.
    protected $table = 'ma_qr_truy_xuat';
    protected $primaryKey = 'Ma_qr';
    // Cho phép ghi hàng loạt dữ liệu mã truy xuất.
    protected $guarded = [];

    public function loHang(): BelongsTo
    {
        // Liên kết mã QR với lô hàng được truy xuất.
        return $this->belongsTo(LoHang::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function nhanVienTao(): BelongsTo
    {
        // Liên kết mã QR với nhân viên tạo mã.
        return $this->belongsTo(NguoiDung::class, 'Ma_nhan_vien_tao', 'Ma_nguoi_dung');
    }
}
