<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mua_vu', function (Blueprint $table) {
            $table->id('Ma_mua_vu');
            $table->unsignedBigInteger('Ma_nong_trai')->default(1);
            $table->string('Ten_mua_vu', 150);
            $table->date('Ngay_bat_dau');
            $table->date('Ngay_ket_thuc')->nullable();
            $table->enum('Trang_thai', ['Dang_dien_ra', 'Da_ket_thuc'])->default('Dang_dien_ra');
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->foreign('Ma_nong_trai', 'fk_mv_nong_trai')
                ->references('Ma_nong_trai')->on('nong_trai');
        });

        Schema::create('lo_canh_tac', function (Blueprint $table) {
            $table->id('Ma_lo_canh_tac');
            $table->unsignedBigInteger('Ma_mua_vu');
            $table->unsignedBigInteger('Ma_san_pham');
            $table->string('Ten_lo', 150);
            $table->decimal('Dien_tich', 10, 2)->nullable();
            $table->date('Ngay_gieo_trong');
            $table->enum('Trang_thai', ['Dang_canh_tac', 'Da_thu_hoach'])->default('Dang_canh_tac');
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->index(['Ma_san_pham', 'Trang_thai'], 'idx_lct_sp_trang_thai');
            $table->foreign('Ma_mua_vu', 'fk_lct_mua_vu')
                ->references('Ma_mua_vu')->on('mua_vu');
            $table->foreign('Ma_san_pham', 'fk_lct_san_pham')
                ->references('Ma_san_pham')->on('san_pham');
        });

        Schema::create('nhat_ky_canh_tac', function (Blueprint $table) {
            $table->id('Ma_nhat_ky');
            $table->unsignedBigInteger('Ma_lo_canh_tac');
            $table->unsignedBigInteger('Ma_nhan_vien');
            $table->enum('Loai_hoat_dong', ['Gieo_hat', 'Bon_phan', 'Tuoi_tieu', 'Thu_hoach', 'Khac']);
            $table->dateTime('Thoi_gian_thuc_hien');
            $table->text('Noi_dung');
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->index(['Ma_lo_canh_tac', 'Thoi_gian_thuc_hien'], 'idx_nk_lo_thoi_gian');
            $table->foreign('Ma_lo_canh_tac', 'fk_nk_lo_canh_tac')
                ->references('Ma_lo_canh_tac')->on('lo_canh_tac')->onDelete('cascade');
            $table->foreign('Ma_nhan_vien', 'fk_nk_nhan_vien')
                ->references('Ma_nguoi_dung')->on('nguoi_dung');
        });

        Schema::create('tep_nhat_ky', function (Blueprint $table) {
            $table->id('Ma_tep');
            $table->unsignedBigInteger('Ma_nhat_ky');
            $table->enum('Loai_tep', ['Hinh_anh', 'Video']);
            $table->string('Duong_dan', 500);
            $table->string('Mo_ta', 255)->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->foreign('Ma_nhat_ky', 'fk_tnk_nhat_ky')
                ->references('Ma_nhat_ky')->on('nhat_ky_canh_tac')->onDelete('cascade');
        });

        Schema::create('lo_hang', function (Blueprint $table) {
            $table->id('Ma_lo_hang');
            $table->unsignedBigInteger('Ma_lo_canh_tac');
            $table->unsignedBigInteger('Ma_nhan_vien_phu_trach');
            $table->date('Ngay_thu_hoach');
            $table->date('Han_su_dung');
            $table->decimal('So_luong_thu_hoach', 10, 2);
            $table->decimal('So_luong_con_lai', 10, 2);
            $table->enum('Trang_thai', ['Con_hang', 'Sap_het_han', 'Het_hang', 'Da_huy'])->default('Con_hang');
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->index(['Trang_thai', 'Han_su_dung', 'So_luong_con_lai'], 'idx_lo_hang_fefo');
            $table->index(['Ma_lo_canh_tac', 'Trang_thai', 'Han_su_dung'], 'idx_lh_lct_fefo');
            $table->foreign('Ma_lo_canh_tac', 'fk_lh_lo_canh_tac')
                ->references('Ma_lo_canh_tac')->on('lo_canh_tac');
            $table->foreign('Ma_nhan_vien_phu_trach', 'fk_lh_nhan_vien')
                ->references('Ma_nguoi_dung')->on('nguoi_dung');
        });

        Schema::create('ma_qr_truy_xuat', function (Blueprint $table) {
            $table->id('Ma_qr');
            $table->unsignedBigInteger('Ma_lo_hang')->unique();
            $table->unsignedBigInteger('Ma_nhan_vien_tao')->nullable();
            $table->string('Chuoi_ma_qr', 100)->unique();
            $table->string('Duong_dan_anh_qr', 500);
            $table->unsignedInteger('So_luot_quet')->default(0);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->foreign('Ma_lo_hang', 'fk_qr_lo_hang')
                ->references('Ma_lo_hang')->on('lo_hang')->onDelete('cascade');
            $table->foreign('Ma_nhan_vien_tao', 'fk_qr_nhan_vien')
                ->references('Ma_nguoi_dung')->on('nguoi_dung');
        });

        Schema::create('chung_nhan', function (Blueprint $table) {
            $table->id('Ma_chung_nhan');
            $table->unsignedBigInteger('Ma_lo_hang')->nullable();
            $table->unsignedBigInteger('Ma_san_pham')->nullable();
            $table->string('Ten_chung_nhan', 150);
            $table->string('To_chuc_cap', 150);
            $table->date('Ngay_cap');
            $table->date('Ngay_het_han')->nullable();
            $table->string('Duong_dan_tep', 500);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->foreign('Ma_lo_hang', 'fk_cn_lo_hang')
                ->references('Ma_lo_hang')->on('lo_hang')->onDelete('cascade');
            $table->foreign('Ma_san_pham', 'fk_cn_san_pham')
                ->references('Ma_san_pham')->on('san_pham')->onDelete('cascade');
        });

        Schema::create('bien_dong_kho', function (Blueprint $table) {
            $table->id('Ma_bien_dong');
            $table->unsignedBigInteger('Ma_lo_hang');
            $table->unsignedBigInteger('Ma_nhan_vien');
            $table->enum('Loai_bien_dong', ['Hao_hut', 'Xuat_huy', 'Dieu_chinh']);
            $table->decimal('So_luong', 10, 2);
            $table->string('Ly_do', 255);
            $table->dateTime('Ngay_ghi_nhan')->useCurrent();
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent()->useCurrentOnUpdate();

            $table->index(['Loai_bien_dong', 'Ngay_ghi_nhan'], 'idx_bdk_loai_ngay');
            $table->foreign('Ma_lo_hang', 'fk_bdk_lo_hang')
                ->references('Ma_lo_hang')->on('lo_hang');
            $table->foreign('Ma_nhan_vien', 'fk_bdk_nhan_vien')
                ->references('Ma_nguoi_dung')->on('nguoi_dung');
        });
    }


    public function down(): void
    {

        Schema::dropIfExists ('bien_dong_kho');
        Schema::dropIfExists ('chung_nhan');
        Schema::dropIfExists('ma_qr_truy_xuat');
        Schema::dropIfExists('lo_hang');
        Schema::dropIfExists('tep_nhat_ky');
        Schema::dropIfExists('nhat_ky_canh_tac');
        Schema::dropIfExists('lo_canh_tac');
        Schema::dropIfExists('mua_vu');
    }
};
