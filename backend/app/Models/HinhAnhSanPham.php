<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HinhAnhSanPham extends Model
{
    // Model lưu thư viện ảnh và vị trí ảnh chính của sản phẩm.
    protected $table = 'hinh_anh_san_pham';

    protected $primaryKey = 'Ma_hinh_anh';

    // Chỉ cho phép gán các trường ảnh được khai báo.
    protected $fillable = [
        'Ma_san_pham',
        'Duong_dan',
        'Thu_tu',
        'La_anh_chinh',
    ];

    // Ép kiểu ảnh chính và thứ tự để phục vụ lọc và sắp xếp.
    protected $casts = [
        'La_anh_chinh' => 'boolean',
        'Thu_tu' => 'integer',
    ];

    public function sanPham(): BelongsTo
    {
        // Liên kết ảnh với sản phẩm sở hữu.
        return $this->belongsTo(SanPham::class, 'Ma_san_pham', 'Ma_san_pham');
    }
}