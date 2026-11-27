<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

class DonHang extends Model
{
    // Model trung tâm lưu đơn hàng và quan hệ thanh toán, giao hàng, khiếu nại.
    protected $table = 'don_hang';

    protected $primaryKey = 'Ma_don_hang';

    // Cho phép ghi hàng loạt dữ liệu đơn hàng.
    protected $guarded = [];

    public function chiTiets(): HasMany
    {
        // Lấy các dòng sản phẩm thuộc đơn hàng.
        return $this->hasMany(ChiTietDonHang::class, 'Ma_don_hang', 'Ma_don_hang');
    }

    public function diaChi(): BelongsTo
    {
        // Liên kết đơn hàng với địa chỉ giao hàng đã chọn.
        return $this->belongsTo(DiaChiGiaoHang::class, 'Ma_dia_chi', 'Ma_dia_chi');
    }

    public function khachHang(): BelongsTo
    {
        // Liên kết đơn hàng với khách hàng đặt mua.
        return $this->belongsTo(NguoiDung::class, 'Ma_nguoi_dung', 'Ma_nguoi_dung');
    }

    public function thanhToans(): HasMany
    {
        // Lấy toàn bộ lần thanh toán của đơn hàng.
        return $this->hasMany(ThanhToan::class, 'Ma_don_hang', 'Ma_don_hang');
    }

    public function giaoHang(): HasOne
    {
        // Lấy bản ghi giao hàng duy nhất gắn với đơn hàng.
        return $this->hasOne(GiaoHang::class, 'Ma_don_hang', 'Ma_don_hang');
    }

    public function dangKyGoi(): BelongsTo
    {
        // Liên kết đơn hàng với đăng ký gói nếu đơn được tạo từ gói.
        return $this->belongsTo(DangKyGoi::class, 'Ma_dang_ky_goi', 'Ma_dang_ky');
    }

    public function khieuNais(): HasMany
    {
        // Lấy các khiếu nại phát sinh từ đơn hàng.
        return $this->hasMany(KhieuNai::class, 'Ma_don_hang', 'Ma_don_hang');
    }

    public function claimDeadlineAt(): ?Carbon
    {
        // Mốc khiếu nại kéo dài 24 giờ kể từ thời điểm giao thành công.
        $deliveredAt = $this->giaoHang?->Ngay_giao_thanh_cong;

        return $deliveredAt ? Carbon::parse($deliveredAt)->addHours(24) : null;
    }

    public function isClaimWindowOpen(): bool
    {
        // Chỉ mở cửa sổ khi đã có giao thành công và chưa vượt quá hạn.
        $deadline = $this->claimDeadlineAt();

        return $deadline !== null && now()->lessThanOrEqualTo($deadline);
    }
}
