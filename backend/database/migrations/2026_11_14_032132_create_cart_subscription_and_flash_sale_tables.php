<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('Gio_hang', function (Blueprint $table) {
            $table->id('Ma_gio_hang');
            $table->unsignedBigInteger('Ma_nguoi_dung')->unique();
            $table->timestamps();

            $table->foreign('Ma_nguoi_dung', 'fk_gh_nguoi_dung')
                  ->references('Ma_nguoi_dung')->on('Nguoi_dung')->onDelete('cascade');
        });

        Schema::create('Chi_tiet_gio_hang', function (Blueprint $table) {
            $table->id('Ma_ct_gio_hang');
            $table->unsignedBigInteger('Ma_gio_hang');
            $table->unsignedBigInteger('Ma_san_pham');
            $table->decimal('So_luong', 10, 2)->default(1.00);
            $table->timestamps();

            $table->unique(['Ma_gio_hang', 'Ma_san_pham'], 'uq_gio_hang_san_pham');
            $table->foreign('Ma_gio_hang', 'fk_ctgh_gio_hang')->references('Ma_gio_hang')->on('Gio_hang')->onDelete('cascade');
            $table->foreign('Ma_san_pham', 'fk_ctgh_san_pham')->references('Ma_san_pham')->on('San_pham')->onDelete('cascade');
        });

        Schema::create('Goi_dinh_ky', function (Blueprint $table) {
            $table->id('Ma_goi');
            $table->string('Ten_goi', 150);
            $table->text('Mo_ta')->nullable();
            $table->decimal('Gia_goi', 12, 2);
            $table->unsignedInteger('Ky_han_thang')->default(1);
            $table->decimal('Khoi_luong_moi_lan', 10, 2);
            $table->enum('Trang_thai', ['Dang_mo', 'Tam_ngung'])->default('Dang_mo');
            $table->timestamps();
        });

        Schema::create('Chi_tiet_goi', function (Blueprint $table) {
            $table->id('Ma_ct_goi');
            $table->unsignedBigInteger('Ma_goi');
            $table->unsignedBigInteger('Ma_san_pham');
            $table->decimal('So_luong', 10, 2);
            $table->timestamps();

            $table->foreign('Ma_goi', 'fk_ctg_goi')->references('Ma_goi')->on('Goi_dinh_ky')->onDelete('cascade');
            $table->foreign('Ma_san_pham', 'fk_ctg_san_pham')->references('Ma_san_pham')->on('San_pham');
        });

        Schema::create('Dang_ky_goi', function (Blueprint $table) {
            $table->id('Ma_dang_ky');
            $table->unsignedBigInteger('Ma_nguoi_dung');
            $table->unsignedBigInteger('Ma_goi');
            $table->unsignedBigInteger('Ma_dia_chi');
            $table->date('Ngay_bat_dau');
            $table->date('Ngay_ket_thuc');
            $table->enum('Trang_thai', ['Cho_thanh_toan', 'Dang_hoat_dong', 'Tam_dung', 'Het_han', 'Da_huy'])
                  ->default('Cho_thanh_toan');
            $table->timestamps();

            $table->foreign('Ma_nguoi_dung', 'fk_dkg_nguoi_dung')->references('Ma_nguoi_dung')->on('Nguoi_dung');
            $table->foreign('Ma_goi', 'fk_dkg_goi')->references('Ma_goi')->on('Goi_dinh_ky');
            $table->foreign('Ma_dia_chi', 'fk_dkg_dia_chi')->references('Ma_dia_chi')->on('Dia_chi_giao_hang');
        });

        Schema::create('Lich_giao_dinh_ky', function (Blueprint $table) {
            $table->id('Ma_lich_giao');
            $table->unsignedBigInteger('Ma_dang_ky');
            $table->unsignedTinyInteger('Thu_trong_tuan');
            $table->string('Khung_gio_giao', 50)->nullable();
            $table->enum('Trang_thai', ['Hoat_dong', 'Tam_ngung'])->default('Hoat_dong');
            $table->timestamps();

            $table->unique(['Ma_dang_ky', 'Thu_trong_tuan'], 'uq_dang_ky_thu');
            $table->foreign('Ma_dang_ky', 'fk_lgdk_dang_ky')->references('Ma_dang_ky')->on('Dang_ky_goi')->onDelete('cascade');
        });

        Schema::create('Chuong_trinh_flash_sale', function (Blueprint $table) {
            $table->id('Ma_flash_sale');
            $table->unsignedBigInteger('Ma_sales_tao')->nullable();
            $table->string('Ten_chuong_trinh', 150);
            $table->dateTime('Thoi_gian_bat_dau');
            $table->dateTime('Thoi_gian_ket_thuc');
            $table->enum('Trang_thai', ['Sap_dien_ra', 'Dang_dien_ra', 'Da_ket_thuc'])->default('Sap_dien_ra');
            $table->timestamps();

            $table->foreign('Ma_sales_tao', 'fk_fs_sales')->references('Ma_nguoi_dung')->on('Nguoi_dung');
        });

        Schema::create('Chi_tiet_flash_sale', function (Blueprint $table) {
            $table->id('Ma_ct_flash_sale');
            $table->unsignedBigInteger('Ma_flash_sale');
            $table->unsignedBigInteger('Ma_lo_hang');
            $table->decimal('Gia_giam', 12, 2);
            $table->decimal('So_luong_gioi_han', 10, 2);
            $table->decimal('So_luong_da_ban', 10, 2)->default(0.00);
            $table->timestamps();

            $table->foreign('Ma_flash_sale', 'fk_ctfs_flash_sale')
                  ->references('Ma_flash_sale')->on('Chuong_trinh_flash_sale')->onDelete('cascade');
            $table->foreign('Ma_lo_hang', 'fk_ctfs_lo_hang')
                  ->references('Ma_lo_hang')->on('Lo_hang');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Chi_tiet_flash_sale');
        Schema::dropIfExists('Chuong_trinh_flash_sale');
        Schema::dropIfExists('Lich_giao_dinh_ky');
        Schema::dropIfExists('Dang_ky_goi');
        Schema::dropIfExists('Chi_tiet_goi');
        Schema::dropIfExists('Goi_dinh_ky');
        Schema::dropIfExists('Chi_tiet_gio_hang');
        Schema::dropIfExists('Gio_hang');
    }
};