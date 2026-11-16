<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $columns = [
            'Ma_giao_dich_apipay' => fn (Blueprint $table) => $table->string('Ma_giao_dich_apipay', 100)->nullable()->unique(),
            'Ma_yeu_cau_apipay' => fn (Blueprint $table) => $table->string('Ma_yeu_cau_apipay', 100)->nullable()->unique(),
            'Noi_dung_thanh_toan' => fn (Blueprint $table) => $table->string('Noi_dung_thanh_toan', 100)->nullable()->unique(),
            'Ma_tham_chieu_ngan_hang' => fn (Blueprint $table) => $table->string('Ma_tham_chieu_ngan_hang', 100)->nullable(),
            'Duong_dan_thanh_toan' => fn (Blueprint $table) => $table->string('Duong_dan_thanh_toan', 500)->nullable(),
        ];

        foreach ($columns as $column => $definition) {
            if (! Schema::hasColumn('Thanh_toan', $column)) {
                Schema::table('Thanh_toan', $definition);
            }
        }
    }

    public function down(): void {}
};
