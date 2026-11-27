<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CauHinhHeThong extends Model
{
    // Model quản lý cấu hình hệ thống theo cặp khóa và giá trị.
    protected $table = 'cau_hinh_he_thong';

    // Khóa chính là chuỗi khóa cấu hình, không tự tăng.
    protected $primaryKey = 'Khoa';

    public $incrementing = false;

    protected $keyType = 'string';

    // Bảng cấu hình không dùng created_at và updated_at.
    public $timestamps = false;

    // Chỉ khai báo các trường cấu hình được phép gán hàng loạt.
    protected $fillable = [
        'Khoa',
        'Gia_tri',
        'Mo_ta',
    ];

    /**
     * Lấy nhanh giá trị cấu hình theo khóa (trả về giá trị mặc định nếu không tìm thấy).
     */
    public static function layGiaTri(string $khoa, mixed $macDinh = null): mixed
    {
        // Tìm bản ghi cấu hình theo khóa; dùng giá trị mặc định nếu chưa tồn tại.
        $record = static::query()->where('Khoa', $khoa)->first();

        return $record ? $record->Gia_tri : $macDinh;
    }
}