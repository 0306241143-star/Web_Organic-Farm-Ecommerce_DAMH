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
        // Lấy ngày hiện tại để so sánh hạn sử dụng theo ngày, không xét giờ.
        $today = now()->toDateString();

        // Chốt ngày cuối của cửa sổ cảnh báo: hôm nay và 2 ngày tiếp theo.
        $warningDeadline = now()->addDays(2)->toDateString();

        // Đếm số lô đã xử lý quá hạn và số lô vừa được đánh dấu sắp hết hạn.
        $expiredCount = 0;
        $expiringSoonCount = 0;

        // 1. Tìm các lô còn hàng hoặc đã được cảnh báo nhưng hạn sử dụng trước hôm nay.
        LoHang::query()
            ->whereIn('Trang_thai', ['Con_hang', 'Sap_het_han'])
            ->whereDate('Han_su_dung', '<', $today)
            ->orderBy('Ma_lo_hang')
            // Chia thành từng nhóm 100 lô để tránh nạp toàn bộ dữ liệu vào bộ nhớ.
            ->chunkById(100, function ($batches) use (&$expiredCount): void {
                // Xử lý lần lượt từng lô trong nhóm vừa lấy.
                foreach ($batches as $batch) {
                    // Dùng transaction để cập nhật tồn kho và lịch sử kho cùng nhau.
                    DB::transaction(function () use ($batch, &$expiredCount): void {
                        // Khóa bản ghi và đọc lại trạng thái mới nhất để tránh xử lý đồng thời.
                        $locked = LoHang::query()
                            ->whereKey($batch->Ma_lo_hang)
                            ->lockForUpdate()
                            ->first();

                        // Bỏ qua nếu lô đã bị xóa hoặc trạng thái không còn cần xử lý.
                        if (! $locked || ! in_array($locked->Trang_thai, ['Con_hang', 'Sap_het_han'], true)) {
                            return;
                        }

                        // Làm tròn tồn kho về 2 chữ số thập phân trước khi ghi nhận.
                        $remainingQty = round((float) $locked->So_luong_con_lai, 2);

                        // Nếu còn hàng, ghi nhận lượng hàng hết hạn là một lần xuất hủy.
                        if ($remainingQty > 0) {
                            // Ưu tiên nhân viên phụ trách lô; nếu thiếu thì dùng người dùng đầu tiên làm người ghi nhận.
                            $staffId = (int) ($locked->Ma_nhan_vien_phu_trach
                                ?: NguoiDung::query()->value('Ma_nguoi_dung'));

                            // Chỉ tạo biến động kho khi tìm được mã nhân viên hợp lệ.
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

                            // Đưa tồn kho về 0 và chuyển lô sang trạng thái đã hủy.
                            $locked->update([
                                'So_luong_con_lai' => 0,
                                'Trang_thai'       => 'Da_huy',
                            ]);
                        } else {
                            // Nếu lô đã hết hàng từ trước, chỉ cập nhật trạng thái cho đúng.
                            $locked->update([
                                'Trang_thai' => 'Het_hang',
                            ]);
                        }

                        // Tăng bộ đếm sau khi đã xử lý xong lô.
                        $expiredCount++;
                    });
                }
            }, 'Ma_lo_hang');

        // 2. Đánh dấu lô còn hàng là sắp hết hạn nếu HSD từ hôm nay đến hết ngày cảnh báo.
        $expiringSoonCount = LoHang::query()
            ->where('Trang_thai', 'Con_hang')
            ->where('So_luong_con_lai', '>', 0)
            ->whereDate('Han_su_dung', '>=', $today)
            ->whereDate('Han_su_dung', '<=', $warningDeadline)
            ->update(['Trang_thai' => 'Sap_het_han']);

        // 3. Đóng chiến dịch Flash Sale chưa kết thúc nhưng đã qua thời gian kết thúc.
        $closedFlashSales = ChuongTrinhFlashSale::query()
            ->whereIn('Trang_thai', ['Sap_dien_ra', 'Dang_dien_ra'])
            ->where('Thoi_gian_ket_thuc', '<', now())
            ->update(['Trang_thai' => 'Da_ket_thuc']);

        // Xóa cache liên quan để người dùng không tiếp tục thấy sản phẩm/trạng thái cũ.
        if ($expiredCount > 0 || $expiringSoonCount > 0 || $closedFlashSales > 0) {
            Cache::forget('public_catalog_products_v1');
            Cache::forget('public_catalog_products_v2');
            Cache::forget('public_categories_list');
            Cache::forget('public_active_flash_sales_v1');
        }

        // Ghi kết quả chạy lệnh vào console để tiện theo dõi.
        $this->info(
            "Batch expiry sync completed: {$expiredCount} expired batch(es) locked, {$expiringSoonCount} batch(es) marked Sap_het_han, {$closedFlashSales} Flash Sale(s) closed."
        );

        // Báo cho Laravel biết lệnh đã chạy thành công.
        return self::SUCCESS;
    }
}