<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SanPham extends Model
{
    protected $table = 'San_pham';
    protected $primaryKey = 'Ma_san_pham';
    protected $guarded = [];
}

