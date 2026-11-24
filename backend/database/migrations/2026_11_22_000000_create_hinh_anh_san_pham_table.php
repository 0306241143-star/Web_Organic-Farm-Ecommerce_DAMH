<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('hinh_anh_san_pham')) {
            Schema::create('hinh_anh_san_pham', function (Blueprint $table) {
                $table->id('Ma_hinh_anh');
                $table->unsignedBigInteger('Ma_san_pham');
                $table->string('Duong_dan', 500);
                $table->string('Mo_ta', 255)->nullable();
                $table->integer('Thu_tu')->default(0);
                $table->boolean('La_anh_chinh')->default(false);
                $table->timestamp('created_at')->nullable()->useCurrent();
                $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

                $table->index(['Ma_san_pham', 'Thu_tu'], 'idx_hasp_sp_thu_tu');
                $table->foreign('Ma_san_pham', 'fk_hasp_san_pham')
                    ->references('Ma_san_pham')->on('san_pham')->onDelete('cascade');
            });
        } elseif (! Schema::hasColumn('hinh_anh_san_pham', 'La_anh_chinh')) {
            Schema::table('hinh_anh_san_pham', function (Blueprint $table) {
                $table->boolean('La_anh_chinh')->default(false);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('hinh_anh_san_pham');
    }
};
