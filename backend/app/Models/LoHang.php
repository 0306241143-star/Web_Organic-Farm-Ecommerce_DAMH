<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoHang extends Model
{
    protected $table = 'Lo_hang';
    protected $primaryKey = 'Ma_lo_hang';
    protected $guarded = [];

    public function scopeKhaDungFefo($query)
    {
        return $query->whereIn('Trang_thai', ['Con_hang', 'Sap_het_han'])
                    ->where('So_luong_con_lai', '>', 0)
                    ->orderBy('Han_su_dung', 'asc');
    }
}

