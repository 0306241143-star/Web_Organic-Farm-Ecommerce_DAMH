<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (
            Schema::hasTable('hinh_anh_san_pham')
            && ! Schema::hasColumn('hinh_anh_san_pham', 'La_anh_chinh')
        ) {
            Schema::table('hinh_anh_san_pham', function (Blueprint $table) {
                $table->boolean('La_anh_chinh')->default(false)->after('Thu_tu');
            });
        }
    }

    public function down(): void
    {
        if (
            Schema::hasTable('hinh_anh_san_pham')
            && Schema::hasColumn('hinh_anh_san_pham', 'La_anh_chinh')
        ) {
            Schema::table('hinh_anh_san_pham', function (Blueprint $table) {
                $table->dropColumn('La_anh_chinh');
            });
        }
    }
};
