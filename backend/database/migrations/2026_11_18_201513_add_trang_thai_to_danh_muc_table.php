<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('danh_muc', 'Trang_thai')) {
            Schema::table('danh_muc', function (Blueprint $table) {
                $table->enum('Trang_thai', ['Hoat_dong', 'Tam_an'])
                    ->default('Hoat_dong')
                    ->after('Mo_ta');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('danh_muc', 'Trang_thai')) {
            Schema::table('danh_muc', function (Blueprint $table) {
                $table->dropColumn('Trang_thai');
            });
        }
    }
};