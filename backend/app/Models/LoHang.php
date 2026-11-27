<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class LoHang extends Model
{
    // Model quản lý lô hàng tồn kho, hạn sử dụng và truy xuất nguồn gốc.
    protected $table = 'lo_hang';
    protected $primaryKey = 'Ma_lo_hang';
    // Cho phép ghi hàng loạt dữ liệu lô hàng.
    protected $guarded = [];

    public function loCanhTac(): BelongsTo
    {
        // Liên kết lô hàng với lô canh tác tạo ra nguồn gốc.
        return $this->belongsTo(LoCanhTac::class, 'Ma_lo_canh_tac', 'Ma_lo_canh_tac');
    }

    public function nhanVienPhuTrach(): BelongsTo
    {
        // Liên kết lô hàng với nhân viên phụ trách kho.
        return $this->belongsTo(NguoiDung::class, 'Ma_nhan_vien_phu_trach', 'Ma_nguoi_dung');
    }

    public function maQrTruyXuat(): HasOne
    {
        // Lấy mã QR truy xuất duy nhất gắn với lô hàng.
        return $this->hasOne(MaQrTruyXuat::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function bienDongKhos(): HasMany
    {
        // Lấy lịch sử nhập, xuất và điều chỉnh tồn kho của lô.
        return $this->hasMany(BienDongKho::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function chungNhans(): HasMany
    {
        // Lấy các chứng nhận gắn với lô hàng.
        return $this->hasMany(ChungNhan::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function chiTietFlashSales(): HasMany
    {
        // Lấy các dòng Flash Sale đã áp dụng cho lô hàng.
        return $this->hasMany(ChiTietFlashSale::class, 'Ma_lo_hang', 'Ma_lo_hang');
    }

    public function scopeKhaDungFefo($query)
    {
        // Chỉ lấy lô còn tồn kho và còn trạng thái bán được, ưu tiên HSD sớm nhất.
        return $query->whereIn('Trang_thai', ['Con_hang', 'Sap_het_han'])
                    ->where('So_luong_con_lai', '>', 0)
                    ->orderBy('Han_su_dung', 'asc');
    }
}
