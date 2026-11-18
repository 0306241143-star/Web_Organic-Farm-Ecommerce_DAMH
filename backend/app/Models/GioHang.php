<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GioHang extends Model
{
    protected $table = 'Gio_hang';

    protected $primaryKey = 'Ma_gio_hang';

    protected $guarded = [];

    public function chiTiets(): HasMany
    {
        return $this->hasMany(ChiTietGioHang::class, 'Ma_gio_hang', 'Ma_gio_hang');
    }
}
