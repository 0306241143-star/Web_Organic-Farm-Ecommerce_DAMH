<?php

/*
 * Tác vụ quét định kỳ hạn sử dụng lô hàng FEFO (UC-03 & UC-18):
 * - Chuyển lô còn <= 2 ngày sang trạng thái Sap_het_han.
 * - Khóa lô quá hạn (Han_su_dung < hôm nay) sang Da_huy / Het_hang và ghi nhận xuất hủy kho.
 * - Đóng các chương trình Flash Sale đã quá thời gian kết thúc.
 */

namespace App\Console\Commands;

use App\Models\BienDongKho;
use App\Models\ChuongTrinhFlashSale;
use App\Models\LoHang;
use App\Models\NguoiDung;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SyncBatchExpiryStatuses extends Command
{
    protected $signature = 'inventory:sync-batch-expiry';

    protected $description = 'Tự động cập nhật trạng thái lô sắp hết hạn (<= 2 ngày) và khóa lô quá hạn sử dụng.';

    public function handle(): int
    {
        $today = now()->toDateString();
        $warningDeadline = now()->addDays(2)->toDateString();

        $expiredCount = 0;
        $expiringSoonCount = 0;

        // 1. Khóa các lô hàng đã quá hạn sử dụng (Han_su_dung < hôm nay)
        LoHang::query()
            ->whereIn('Trang_thai', ['Con_hang', 'Sap_het_han'])
            ->whereDate('Han_su_dung', '<', $today)
            ->orderBy('Ma_lo_hang')
            ->chunkById(100, function ($batches) use (&$expiredCount): void {
                foreach ($batches as $batch) {
                    DB::transaction(function () use ($batch, &$expiredCount): void {
                        $locked = LoHang::query()
                            ->whereKey($batch->Ma_lo_hang)
                            ->lockForUpdate()
                            ->first();

                        if (! $locked || ! in_array($locked->Trang_thai, ['Con_hang', 'Sap_het_han'], true)) {
                            return;
                        }

                        $remainingQty = round((float) $locked->So_luong_con_lai, 2);

                        if ($remainingQty > 0) {
                            $staffId = (int) ($locked->Ma_nhan_vien_phu_trach
                                ?: NguoiDung::query()->value('Ma_nguoi_dung'));

                            if ($staffId > 0) {
                                BienDongKho::query()->create([
                                    'Ma_lo_hang'    => $locked->Ma_lo_hang,
                                    'Ma_nhan_vien'  => $staffId,
                                    'Loai_bien_dong'=> 'Xuat_huy',
                                    'So_luong'      => $remainingQty,
                                    'Ly_do'         => "Tự động xuất hủy do quá hạn sử dụng ({$locked->Han_su_dung})",
                                    'Ngay_ghi_nhan' => now(),
                                ]);
                            }

                            $locked->update([
                                'So_luong_con_lai' => 0,
                                'Trang_thai'       => 'Da_huy',
                            ]);
                        } else {
                            $locked->update([
                                'Trang_thai' => 'Het_hang',
                            ]);
                        }

                        $expiredCount++;
                    });
                }
            }, 'Ma_lo_hang');

        // 2. Gắn cờ Sap_het_han cho các lô còn hàng có HSD trong vòng 2 ngày tới
        $expiringSoonCount = LoHang::query()
            ->where('Trang_thai', 'Con_hang')
            ->where('So_luong_con_lai', '>', 0)
            ->whereDate('Han_su_dung', '>=', $today)
            ->whereDate('Han_su_dung', '<=', $warningDeadline)
            ->update(['Trang_thai' => 'Sap_het_han']);

        // 3. Tự động kết thúc các chiến dịch Flash Sale đã quá giờ
        $closedFlashSales = ChuongTrinhFlashSale::query()
            ->whereIn('Trang_thai', ['Sap_dien_ra', 'Dang_dien_ra'])
            ->where('Thoi_gian_ket_thuc', '<', now())
            ->update(['Trang_thai' => 'Da_ket_thuc']);

        if ($expiredCount > 0 || $expiringSoonCount > 0 || $closedFlashSales > 0) {
            Cache::forget('public_catalog_products_v1');
            Cache::forget('public_catalog_products_v2');
            Cache::forget('public_categories_list');
            Cache::forget('public_active_flash_sales_v1');
        }

        $this->info(
            "Batch expiry sync completed: {$expiredCount} expired batch(es) locked, {$expiringSoonCount} batch(es) marked Sap_het_han, {$closedFlashSales} Flash Sale(s) closed."
        );

        return self::SUCCESS;
    }
}