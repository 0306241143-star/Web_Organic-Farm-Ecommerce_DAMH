<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('don_hang', function (Blueprint $table): void {
            $table->index(['Trang_thai', 'Ngay_dat'], 'idx_dh_sales_status_date');
        });
    }

    public function down(): void
    {
        Schema::table('don_hang', function (Blueprint $table): void {
            $table->dropIndex('idx_dh_sales_status_date');
        });
    }
};
