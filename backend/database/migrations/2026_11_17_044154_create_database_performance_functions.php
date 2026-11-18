<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        // 1. Hàm tính tổng tồn kho FEFO khả dụng (chưa hết hạn) của một sản phẩm
        DB::unprepared('DROP FUNCTION IF EXISTS fn_ton_kho_kha_dung');
        DB::unprepared("
            CREATE FUNCTION fn_ton_kho_kha_dung(p_ma_san_pham BIGINT UNSIGNED)
            RETURNS DECIMAL(10,2)
            READS SQL DATA
            BEGIN
                DECLARE v_tong_ton DECIMAL(10,2) DEFAULT 0.00;

                SELECT COALESCE(SUM(lh.So_luong_con_lai), 0.00)
                INTO v_tong_ton
                FROM lo_hang lh
                INNER JOIN lo_canh_tac lct ON lct.Ma_lo_canh_tac = lh.Ma_lo_canh_tac
                WHERE lct.Ma_san_pham = p_ma_san_pham
                  AND lh.Trang_thai IN ('Con_hang', 'Sap_het_han')
                  AND lh.Han_su_dung >= CURDATE()
                  AND lh.So_luong_con_lai > 0;

                RETURN v_tong_ton;
            END
        ");

        // 2. Hàm lấy giá bán thực tế hiện tại (ưu tiên giá Flash Sale nếu đang diễn ra và còn suất)
        DB::unprepared('DROP FUNCTION IF EXISTS fn_gia_ban_hien_tai');
        DB::unprepared("
            CREATE FUNCTION fn_gia_ban_hien_tai(p_ma_san_pham BIGINT UNSIGNED)
            RETURNS DECIMAL(12,2)
            READS SQL DATA
            BEGIN
                DECLARE v_gia_flash DECIMAL(12,2) DEFAULT NULL;
                DECLARE v_gia_goc DECIMAL(12,2) DEFAULT 0.00;

                SELECT MIN(ctfs.Gia_giam)
                INTO v_gia_flash
                FROM chi_tiet_flash_sale ctfs
                INNER JOIN chuong_trinh_flash_sale fs ON fs.Ma_flash_sale = ctfs.Ma_flash_sale
                INNER JOIN lo_hang lh ON lh.Ma_lo_hang = ctfs.Ma_lo_hang
                INNER JOIN lo_canh_tac lct ON lct.Ma_lo_canh_tac = lh.Ma_lo_canh_tac
                WHERE lct.Ma_san_pham = p_ma_san_pham
                  AND fs.Trang_thai = 'Dang_dien_ra'
                  AND NOW() BETWEEN fs.Thoi_gian_bat_dau AND fs.Thoi_gian_ket_thuc
                  AND ctfs.So_luong_da_ban < ctfs.So_luong_gioi_han
                  AND lh.Trang_thai IN ('Con_hang', 'Sap_het_han')
                  AND lh.So_luong_con_lai > 0;

                IF v_gia_flash IS NOT NULL THEN
                    RETURN v_gia_flash;
                END IF;

                SELECT COALESCE(Gia_ban, 0.00)
                INTO v_gia_goc
                FROM san_pham
                WHERE Ma_san_pham = p_ma_san_pham
                LIMIT 1;

                RETURN v_gia_goc;
            END
        ");

        // 3. Hàm tính nhanh số dư điểm tích lũy khả dụng của khách hàng
        DB::unprepared('DROP FUNCTION IF EXISTS fn_tong_diem_nguoi_dung');
        DB::unprepared("
            CREATE FUNCTION fn_tong_diem_nguoi_dung(p_ma_nguoi_dung BIGINT UNSIGNED)
            RETURNS INT
            READS SQL DATA
            BEGIN
                DECLARE v_tong_diem INT DEFAULT 0;

                SELECT COALESCE(SUM(So_diem), 0)
                INTO v_tong_diem
                FROM diem_tich_luy
                WHERE Ma_nguoi_dung = p_ma_nguoi_dung;

                RETURN v_tong_diem;
            END
        ");

        // 4. Hàm tính phí giao hàng theo khoảng cách thực tế (km) và đơn giá ship/km
        DB::unprepared('DROP FUNCTION IF EXISTS fn_tinh_phi_van_chuyen');
        DB::unprepared("
            CREATE FUNCTION fn_tinh_phi_van_chuyen(
                p_khoang_cach_km DECIMAL(8,2),
                p_don_gia_km DECIMAL(12,2)
            )
            RETURNS DECIMAL(12,2)
            DETERMINISTIC
            BEGIN
                IF p_khoang_cach_km <= 0 OR p_don_gia_km <= 0 THEN
                    RETURN 0.00;
                END IF;

                RETURN ROUND(p_khoang_cach_km * p_don_gia_km, 0);
            END
        ");
    }

    public function down(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        DB::unprepared('DROP FUNCTION IF EXISTS fn_tinh_phi_van_chuyen');
        DB::unprepared('DROP FUNCTION IF EXISTS fn_tong_diem_nguoi_dung');
        DB::unprepared('DROP FUNCTION IF EXISTS fn_gia_ban_hien_tai');
        DB::unprepared('DROP FUNCTION IF EXISTS fn_ton_kho_kha_dung');
    }
};