<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CauHinhHeThong extends Model
{
    protected $table = 'cau_hinh_he_thong';

    protected $primaryKey = 'Khoa';

    public $incrementing = false;

    protected $keyType = 'string';

    public $timestamps = false;

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
        $record = static::query()->where('Khoa', $khoa)->first();

        return $record ? $record->Gia_tri : $macDinh;
    }
}