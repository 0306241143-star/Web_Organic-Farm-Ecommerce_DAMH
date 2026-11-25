<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KetQuaKiemDinh extends Model
{
    protected $table = 'ket_qua_kiem_dinh';

    protected $primaryKey = 'Ma_kiem_dinh';

    protected $guarded = [];
}
