<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KetQuaKiemDinh extends Model
{
    // Model lưu kết quả kiểm định chất lượng nông sản.
    protected $table = 'ket_qua_kiem_dinh';

    protected $primaryKey = 'Ma_kiem_dinh';

    // Cho phép ghi hàng loạt dữ liệu kiểm định.
    protected $guarded = [];
}
