<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('Nong_trai', function (Blueprint $table) {
            $table->id('Ma_nong_trai');
            $table->string('Ten_nong_trai', 200);
            $table->string('Dia_chi', 255);
            $table->decimal('Vi_do', 10, 7);
            $table->decimal('Kinh_do', 10, 7);
            $table->text('Cau_chuyen_thuong_hieu')->nullable();
            $table->text('Triet_ly_canh_tac')->nullable();
            $table->text('Ho_so_nang_luc')->nullable();
            $table->timestamps();
        });

        Schema::create('Hinh_anh_nong_trai', function (Blueprint $table) {
            $table->id('Ma_hinh_anh');
            $table->unsignedBigInteger('Ma_nong_trai');
            $table->string('Duong_dan', 500);
            $table->string('Mo_ta', 255)->nullable();
            $table->integer('Thu_tu')->default(0);
            $table->timestamps();

            $table->foreign('Ma_nong_trai', 'fk_hant_nong_trai')
                  ->references('Ma_nong_trai')->on('Nong_trai')->onDelete('cascade');
        });

        Schema::create('Ket_qua_kiem_dinh', function (Blueprint $table) {
            $table->id('Ma_kiem_dinh');
            $table->unsignedBigInteger('Ma_nong_trai');
            $table->enum('Loai_mau', ['Dat', 'Nuoc']);
            $table->date('Ngay_kiem_dinh');
            $table->string('Ket_qua', 255);
            $table->string('Tep_scan', 500);
            $table->text('Ghi_chu')->nullable();
            $table->timestamps();

            $table->foreign('Ma_nong_trai', 'fk_kqkd_nong_trai')
                  ->references('Ma_nong_trai')->on('Nong_trai')->onDelete('cascade');
        });

        Schema::create('Danh_muc', function (Blueprint $table) {
            $table->id('Ma_danh_muc');
            $table->string('Ten_danh_muc', 150);
            $table->text('Mo_ta')->nullable();
            $table->timestamps();
        });

        Schema::create('San_pham', function (Blueprint $table) {
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
            $table->timestamps();

            $table->index(['Ma_danh_muc', 'Trang_thai', 'Gia_ban'], 'idx_sp_danh_muc_gia');
            $table->foreign('Ma_danh_muc', 'fk_sp_danh_muc')->references('Ma_danh_muc')->on('Danh_muc');
            $table->foreign('Ma_nong_trai', 'fk_sp_nong_trai')->references('Ma_nong_trai')->on('Nong_trai');
        });

        Schema::create('Mua_vu', function (Blueprint $table) {
            $table->id('Ma_mua_vu');
            $table->unsignedBigInteger('Ma_nong_trai')->default(1);
            $table->string('Ten_mua_vu', 150);
            $table->date('Ngay_bat_dau');
            $table->date('Ngay_ket_thuc')->nullable();
            $table->enum('Trang_thai', ['Dang_dien_ra', 'Da_ket_thuc'])->default('Dang_dien_ra');
            $table->timestamps();

            $table->foreign('Ma_nong_trai', 'fk_mv_nong_trai')->references('Ma_nong_trai')->on('Nong_trai');
        });

        Schema::create('Lo_canh_tac', function (Blueprint $table) {
            $table->id('Ma_lo_canh_tac');
            $table->unsignedBigInteger('Ma_mua_vu');
            $table->unsignedBigInteger('Ma_san_pham');
            $table->string('Ten_lo', 150);
            $table->decimal('Dien_tich', 10, 2)->nullable();
            $table->date('Ngay_gieo_trong');
            $table->enum('Trang_thai', ['Dang_canh_tac', 'Da_thu_hoach'])->default('Dang_canh_tac');
            $table->timestamps();

            $table->foreign('Ma_mua_vu', 'fk_lct_mua_vu')->references('Ma_mua_vu')->on('Mua_vu');
            $table->foreign('Ma_san_pham', 'fk_lct_san_pham')->references('Ma_san_pham')->on('San_pham');
        });

        Schema::create('Nhat_ky_canh_tac', function (Blueprint $table) {
            $table->id('Ma_nhat_ky');
            $table->unsignedBigInteger('Ma_lo_canh_tac');
            $table->unsignedBigInteger('Ma_nhan_vien');
            $table->enum('Loai_hoat_dong', ['Gieo_hat', 'Bon_phan', 'Tuoi_tieu', 'Thu_hoach', 'Khac']);
            $table->dateTime('Thoi_gian_thuc_hien');
            $table->text('Noi_dung');
            $table->timestamps();

            $table->foreign('Ma_lo_canh_tac', 'fk_nk_lo_canh_tac')
                  ->references('Ma_lo_canh_tac')->on('Lo_canh_tac')->onDelete('cascade');
            $table->foreign('Ma_nhan_vien', 'fk_nk_nhan_vien')
                  ->references('Ma_nguoi_dung')->on('Nguoi_dung');
        });

        Schema::create('Tep_nhat_ky', function (Blueprint $table) {
            $table->id('Ma_tep');
            $table->unsignedBigInteger('Ma_nhat_ky');
            $table->enum('Loai_tep', ['Hinh_anh', 'Video']);
            $table->string('Duong_dan', 500);
            $table->string('Mo_ta', 255)->nullable();
            $table->timestamps();

            $table->foreign('Ma_nhat_ky', 'fk_tnk_nhat_ky')
                  ->references('Ma_nhat_ky')->on('Nhat_ky_canh_tac')->onDelete('cascade');
        });

        Schema::create('Lo_hang', function (Blueprint $table) {
            $table->id('Ma_lo_hang');
            $table->unsignedBigInteger('Ma_lo_canh_tac');
            $table->unsignedBigInteger('Ma_nhan_vien_phu_trach');
            $table->date('Ngay_thu_hoach');
            $table->date('Han_su_dung');
            $table->decimal('So_luong_thu_hoach', 10, 2);
            $table->decimal('So_luong_con_lai', 10, 2);
            $table->enum('Trang_thai', ['Con_hang', 'Sap_het_han', 'Het_hang', 'Da_huy'])->default('Con_hang');
            $table->timestamps();

            $table->index(['Trang_thai', 'Han_su_dung', 'So_luong_con_lai'], 'idx_lo_hang_fefo');
            $table->foreign('Ma_lo_canh_tac', 'fk_lh_lo_canh_tac')->references('Ma_lo_canh_tac')->on('Lo_canh_tac');
            $table->foreign('Ma_nhan_vien_phu_trach', 'fk_lh_nhan_vien')->references('Ma_nguoi_dung')->on('Nguoi_dung');
        });

        Schema::create('Ma_QR_truy_xuat', function (Blueprint $table) {
            $table->id('Ma_qr');
            $table->unsignedBigInteger('Ma_lo_hang')->unique();
            $table->unsignedBigInteger('Ma_nhan_vien_tao')->nullable();
            $table->string('Chuoi_ma_qr', 100)->unique();
            $table->string('Duong_dan_anh_qr', 500);
            $table->unsignedInteger('So_luot_quet')->default(0);
            $table->timestamps();

            $table->foreign('Ma_lo_hang', 'fk_qr_lo_hang')->references('Ma_lo_hang')->on('Lo_hang')->onDelete('cascade');
            $table->foreign('Ma_nhan_vien_tao', 'fk_qr_nhan_vien')->references('Ma_nguoi_dung')->on('Nguoi_dung');
        });

        Schema::create('Chung_nhan', function (Blueprint $table) {
            $table->id('Ma_chung_nhan');
            $table->unsignedBigInteger('Ma_lo_hang')->nullable();
            $table->unsignedBigInteger('Ma_san_pham')->nullable();
            $table->string('Ten_chung_nhan', 150);
            $table->string('To_chuc_cap', 150);
            $table->date('Ngay_cap');
            $table->date('Ngay_het_han')->nullable();
            $table->string('Duong_dan_tep', 500);
            $table->timestamps();

            $table->foreign('Ma_lo_hang', 'fk_cn_lo_hang')->references('Ma_lo_hang')->on('Lo_hang')->onDelete('cascade');
            $table->foreign('Ma_san_pham', 'fk_cn_san_pham')->references('Ma_san_pham')->on('San_pham')->onDelete('cascade');
        });

        Schema::create('Bien_dong_kho', function (Blueprint $table) {
            $table->id('Ma_bien_dong');
            $table->unsignedBigInteger('Ma_lo_hang');
            $table->unsignedBigInteger('Ma_nhan_vien');
            $table->enum('Loai_bien_dong', ['Hao_hut', 'Xuat_huy', 'Dieu_chinh']);
            $table->decimal('So_luong', 10, 2);
            $table->string('Ly_do', 255);
            $table->dateTime('Ngay_ghi_nhan')->useCurrent();
            $table->timestamps();

            $table->foreign('Ma_lo_hang', 'fk_bdk_lo_hang')->references('Ma_lo_hang')->on('Lo_hang');
            $table->foreign('Ma_nhan_vien', 'fk_bdk_nhan_vien')->references('Ma_nguoi_dung')->on('Nguoi_dung');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('Bien_dong_kho');
        Schema::dropIfExists('Chung_nhan');
        Schema::dropIfExists('Ma_QR_truy_xuat');
        Schema::dropIfExists('Lo_hang');
        Schema::dropIfExists('Tep_nhat_ky');
        Schema::dropIfExists('Nhat_ky_canh_tac');
        Schema::dropIfExists('Lo_canh_tac');
        Schema::dropIfExists('Mua_vu');
        Schema::dropIfExists('San_pham');
        Schema::dropIfExists('Danh_muc');
        Schema::dropIfExists('Ket_qua_kiem_dinh');
        Schema::dropIfExists('Hinh_anh_nong_trai');
        Schema::dropIfExists('Nong_trai');
    }
};