<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VaiTro extends Model
{
    // Model vai trò người dùng và liên kết quyền truy cập.
    protected $table = 'vai_tro';
    protected $primaryKey = 'Ma_vai_tro';
    // Cho phép ghi hàng loạt dữ liệu vai trò.
    protected $guarded = [];

    public function quyens()
    {
        // Liên kết vai trò với các quyền qua bảng trung gian.
        return $this->belongsToMany(Quyen::class, 'vai_tro_quyen', 'Ma_vai_tro', 'Ma_quyen');
    }

    public function nguoiDungs()
    {
        // Lấy toàn bộ người dùng thuộc vai trò.
        return $this->hasMany(NguoiDung::class, 'Ma_vai_tro', 'Ma_vai_tro');
    }
}