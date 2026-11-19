<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('cau_hinh_he_thong')->insertOrIgnore([
            'Khoa' => 'diem_quy_doi_vnd',
            'Gia_tri' => '1000',
            'Mo_ta' => 'Số tiền giảm tương ứng với một điểm thưởng (VND)',
        ]);
    }

    public function down(): void
    {
        DB::table('cau_hinh_he_thong')
            ->where('Khoa', 'diem_quy_doi_vnd')
            ->delete();
    }
};
