<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GoiDinhKy extends Model
{
    protected $table = 'Goi_dinh_ky';

    protected $primaryKey = 'Ma_goi';

    protected $guarded = [];

    public function chiTiets(): HasMany
    {
        return $this->hasMany(ChiTietGoi::class, 'Ma_goi', 'Ma_goi');
    }
}
