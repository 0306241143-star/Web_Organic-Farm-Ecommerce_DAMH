<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Quyen extends Model
{
    // Model danh sách quyền trong hệ thống phân quyền.
    protected $table = 'quyen';
    protected $primaryKey = 'Ma_quyen';
    // Cho phép ghi hàng loạt dữ liệu quyền.
    protected $guarded = [];
}