<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vai_tro', function (Blueprint $table) {
            $table->id('Ma_vai_tro');
            $table->string('Ten_vai_tro', 50)->unique();
            $table->string('Mo_ta', 255)->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('quyen', function (Blueprint $table) {
            $table->id('Ma_quyen');
            $table->string('Ten_quyen', 100)->unique();
            $table->string('Mo_ta', 255)->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();
        });

        Schema::create('vai_tro_quyen', function (Blueprint $table) {
            $table->unsignedBigInteger('Ma_vai_tro');
            $table->unsignedBigInteger('Ma_quyen');

            $table->primary(['Ma_vai_tro', 'Ma_quyen']);
            $table->foreign('Ma_vai_tro', 'fk_vtq_vai_tro')
                ->references('Ma_vai_tro')->on('vai_tro')->onDelete('cascade');
            $table->foreign('Ma_quyen', 'fk_vtq_quyen')
                ->references('Ma_quyen')->on('quyen')->onDelete('cascade');
        });

        Schema::create('nguoi_dung', function (Blueprint $table) {
            $table->id('Ma_nguoi_dung');
            $table->unsignedBigInteger('Ma_vai_tro');
            $table->string('Ho_ten', 150);
            $table->string('Email', 150)->unique();
            $table->string('So_dien_thoai', 15)->nullable()->unique();
            $table->string('Mat_khau_ma_hoa', 255);
            $table->enum('Trang_thai', ['Hoat_dong', 'Khoa'])->default('Hoat_dong');
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->index(['Trang_thai', 'Ma_vai_tro'], 'idx_nd_trang_thai_vai_tro');
            $table->foreign('Ma_vai_tro', 'fk_nd_vai_tro')
                ->references('Ma_vai_tro')->on('vai_tro');
        });

        Schema::create('dia_chi_giao_hang', function (Blueprint $table) {
            $table->id('Ma_dia_chi');
            $table->unsignedBigInteger('Ma_nguoi_dung');
            $table->string('Ten_nguoi_nhan', 150);
            $table->string('So_dien_thoai_nguoi_nhan', 15);
            $table->string('Dia_chi_chi_tiet', 255);
            $table->string('Phuong_xa', 100);
            $table->string('Quan_huyen', 100);
            $table->string('Tinh_thanh', 100);
            $table->decimal('Vi_do', 10, 7);
            $table->decimal('Kinh_do', 10, 7);
            $table->boolean('La_mac_dinh')->default(false);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->index(['Ma_nguoi_dung', 'La_mac_dinh'], 'idx_dc_user_mac_dinh');
            $table->foreign('Ma_nguoi_dung', 'fk_dc_nguoi_dung')
                ->references('Ma_nguoi_dung')->on('nguoi_dung')->onDelete('cascade');
        });




        Schema::create('cau_hinh_he_thong', function (Blueprint $table) {
            $table->string('Khoa', 100)->primary();
            $table->text('Gia_tri')->nullable();
            $table->string('Mo_ta', 255)->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();
        });
    }

    public  function down(): void
    {
        Schema::dropIfExists('cau_hinh_he_thong');
        Schema::dropIfExists('dia_chi_giao_hang');
        Schema::dropIfExists('nguoi_dung');
        Schema::dropIfExists('vai_tro_quyen');
        Schema::dropIfExists('quyen');
        Schema::dropIfExists('vai_tro');
    }
};
