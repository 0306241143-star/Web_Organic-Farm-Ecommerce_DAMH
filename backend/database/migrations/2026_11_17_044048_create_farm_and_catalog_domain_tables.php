<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nong_trai', function (Blueprint $table) {
            $table->id('Ma_nong_trai');
            $table->string('Ten_nong_trai', 200);
            $table->string('Dia_chi', 255);
            $table->decimal('Vi_do', 10, 7);
            $table->decimal('Kinh_do', 10, 7);
            $table->text('Cau_chuyen_thuong_hieu')->nullable();
            $table->text('Triet_ly_canh_tac')->nullable();
            $table->text('Ho_so_nang_luc')->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('hinh_anh_nong_trai', function (Blueprint $table) {
            $table->id('Ma_hinh_anh');
            $table->unsignedBigInteger('Ma_nong_trai');
            $table->string('Duong_dan', 500);
            $table->string('Mo_ta', 255)->nullable();
            $table->integer('Thu_tu')->default(0);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->index(['Ma_nong_trai', 'Thu_tu'], 'idx_hant_nt_thu_tu');
            $table->foreign('Ma_nong_trai', 'fk_hant_nong_trai')
                ->references('Ma_nong_trai')->on('nong_trai')->onDelete('cascade');
        });

        Schema::create('ket_qua_kiem_dinh', function (Blueprint $table) {
            $table->id('Ma_kiem_dinh');
            $table->unsignedBigInteger('Ma_nong_trai');
            $table->enum('Loai_mau', ['Dat', 'Nuoc']);
            $table->date('Ngay_kiem_dinh');
            $table->string('Ket_qua', 255);
            $table->string('Tep_scan', 500);
            $table->text('Ghi_chu')->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->index(['Ma_nong_trai', 'Loai_mau', 'Ngay_kiem_dinh'], 'idx_kqkd_nt_loai_ngay');
            $table->foreign('Ma_nong_trai', 'fk_kqkd_nong_trai')
                ->references('Ma_nong_trai')->on('nong_trai')->onDelete('cascade');
        });

        Schema::create('danh_muc', function (Blueprint $table) {
            $table->id('Ma_danh_muc');
            $table->string('Ten_danh_muc', 150);
            $table->text('Mo_ta')->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('san_pham', function (Blueprint $table) {
            $table->id('Ma_san_pham');
            $table->unsignedBigInteger('Ma_danh_muc');
            $table->unsignedBigInteger('Ma_nong_trai')->default(1);
            $table->string('Ten_san_pham', 200);
            $table->text('Mo_ta')->nullable();
            $table->string('Don_vi_tinh', 50);
            $table->decimal('Gia_ban', 12, 2);
            $table->string('Hinh_anh_dai_dien', 500)->nullable();
            $table->decimal('Ty_le_tich_diem', 5, 2)->default(1.00);
            $table->enum('Trang_thai', ['Dang_ban', 'Tam_ngung'])->default('Dang_ban');
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->index(['Ma_danh_muc', 'Trang_thai', 'Gia_ban'], 'idx_sp_danh_muc_gia');
            $table->index(['Trang_thai', 'Ten_san_pham'], 'idx_sp_trang_thai_ten');
            $table->foreign('Ma_danh_muc', 'fk_sp_danh_muc')
                ->references('Ma_danh_muc')->on('danh_muc');
            $table->foreign('Ma_nong_trai', 'fk_sp_nong_trai')
                ->references('Ma_nong_trai')->on('nong_trai');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('san_pham');
        Schema::dropIfExists('danh_muc');
        Schema::dropIfExists('ket_qua_kiem_dinh');
        Schema::dropIfExists('hinh_anh_nong_trai');
        Schema::dropIfExists('nong_trai');
    }
};