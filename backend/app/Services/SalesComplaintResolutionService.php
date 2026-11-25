<?php

namespace App\Services;

use App\Models\ChiTietDonHang;
use App\Models\DonHang;
use App\Models\HoanTien;
use App\Models\KhieuNai;
use App\Models\PhanBoLoHang;
use App\Models\ThanhToan;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesComplaintResolutionService
{
    public function __construct(private FefoStockService $stock)
    {
    }

    public function receive(int $claimId, int $staffId): KhieuNai
    {
        return DB::transaction(function () use ($claimId, $staffId): KhieuNai {
            $claim = KhieuNai::query()
                ->whereKey($claimId)
                ->lockForUpdate()
                ->firstOrFail();

            if ($claim->Trang_thai !== 'Cho_xu_ly') {
                throw ValidationException::withMessages([
                    'claim_id' => 'Chỉ có thể tiếp nhận hồ sơ đang chờ xử lý.',
                ]);
            }

            $claim->update([
                'Trang_thai' => 'Dang_xu_ly',
                'Ma_nhan_vien_xu_ly' => $staffId,
                'Ngay_tiep_nhan' => now(),
            ]);

            return $claim->refresh();
        });
    }

    public function resolve(int $claimId, int $staffId, array $data): KhieuNai
    {
        return DB::transaction(function () use ($claimId, $staffId, $data): KhieuNai {
            $claim = KhieuNai::query()
                ->whereKey($claimId)
                ->lockForUpdate()
                ->firstOrFail();

            if (! in_array($claim->Trang_thai, ['Cho_xu_ly', 'Dang_xu_ly'], true)) {
                throw ValidationException::withMessages([
                    'claim_id' => 'Hồ sơ khiếu nại đã được xử lý trước đó.',
                ]);
            }

            $order = DonHang::query()
                ->whereKey($claim->Ma_don_hang)
                ->lockForUpdate()
                ->firstOrFail();

            $resolution = [
                'Trang_thai' => $data['ket_qua'] === 'tu_choi' ? 'Tu_choi' : 'Da_giai_quyet',
                'Hinh_thuc_xu_ly' => 'Tu_choi',
                'Phan_hoi_cskh' => $data['phan_hoi_cskh'],
                'Ma_nhan_vien_xu_ly' => $staffId,
                'Ngay_xu_ly' => now(),
            ];

            if ($data['ket_qua'] === 'tu_choi') {
                $claim->update($resolution);

                return $claim->refresh();
            }

            if ($data['phuong_an_xu_ly'] === 'hoan_tien') {
                $refund = $this->createRefund($claim, $order, (float) $data['so_tien_hoan']);
                $claim->update(array_merge($resolution, [
                    'Hinh_thuc_xu_ly' => 'Hoan_tien',
                    'So_tien_hoan' => $refund->So_tien,
                ]));

                return $claim->refresh();
            }

            $replacementOrder = $this->createReplacementOrder(
                $claim,
                $order,
                $staffId,
                $data['items']
            );
            $claim->update(array_merge($resolution, [
                'Hinh_thuc_xu_ly' => 'Giao_bu',
                'Ma_don_giao_bu' => $replacementOrder->Ma_don_hang,
            ]));

            return $claim->refresh();
        });
    }

    private function createRefund(KhieuNai $claim, DonHang $order, float $amount): HoanTien
    {
        if ($amount <= 0 || $amount > (float) $order->Tong_tien) {
            throw ValidationException::withMessages([
                'so_tien_hoan' => 'Số tiền hoàn phải lớn hơn 0 và không vượt quá tổng tiền đơn hàng.',
            ]);
        }

        $payment = ThanhToan::query()
            ->where('Ma_don_hang', $order->Ma_don_hang)
            ->where('Trang_thai', 'Thanh_cong')
            ->orderByDesc('Ma_thanh_toan')
            ->lockForUpdate()
            ->first();

        if (! $payment) {
            throw ValidationException::withMessages([
                'phuong_an_xu_ly' => 'Không tìm thấy giao dịch thanh toán thành công để ghi nhận hoàn tiền.',
            ]);
        }

        $alreadyRefunded = (float) DB::table('hoan_tien')
            ->where('Ma_thanh_toan', $payment->Ma_thanh_toan)
            ->whereIn('Trang_thai', ['Cho_xu_ly', 'Thanh_cong'])
            ->sum('So_tien');
        $remainingPaidAmount = round((float) $payment->So_tien - $alreadyRefunded, 2);

        if ($amount > $remainingPaidAmount) {
            throw ValidationException::withMessages([
                'so_tien_hoan' => 'Số tiền hoàn vượt quá số tiền khách đã thanh toán còn có thể hoàn.',
            ]);
        }

        return HoanTien::query()->create([
            'Ma_khieu_nai' => $claim->Ma_khieu_nai,
            'Ma_thanh_toan' => $payment->Ma_thanh_toan,
            'So_tien' => $amount,
            'Trang_thai' => 'Cho_xu_ly',
        ]);
    }

    private function createReplacementOrder(
        KhieuNai $claim,
        DonHang $originalOrder,
        int $staffId,
        array $items
    ): DonHang {
        $details = ChiTietDonHang::query()
            ->where('Ma_don_hang', $originalOrder->Ma_don_hang)
            ->whereIn('Ma_ct_don_hang', collect($items)->pluck('chi_tiet_don_hang_id'))
            ->lockForUpdate()
            ->get()
            ->keyBy('Ma_ct_don_hang');

        if ($details->count() !== count($items)) {
            throw ValidationException::withMessages([
                'items' => 'Một hoặc nhiều sản phẩm giao bù không thuộc đơn hàng gốc.',
            ]);
        }

        $replacement = DonHang::query()->create([
            'Ma_nguoi_dung' => $originalOrder->Ma_nguoi_dung,
            'Ma_dia_chi' => $originalOrder->Ma_dia_chi,
            'Ma_nhan_vien_xac_nhan' => $staffId,
            'Ma_don_goc' => $originalOrder->Ma_don_hang,
            'Ma_khieu_nai' => $claim->Ma_khieu_nai,
            'Loai_don' => 'Giao_bu',
            'Ngay_dat' => now(),
            'Tien_hang' => 0,
            'Khoang_cach_km' => $originalOrder->Khoang_cach_km,
            'Phi_giao_hang' => 0,
            'So_diem_su_dung' => 0,
            'Tien_giam_tu_diem' => 0,
            'Tong_tien' => 0,
            'Trang_thai' => 'Da_xac_nhan',
            'Ghi_chu' => "Đơn giao bù khiếu nại #{$claim->Ma_khieu_nai} cho đơn gốc #{$originalOrder->Ma_don_hang}.",
        ]);

        foreach ($items as $item) {
            $detail = $details->get((int) $item['chi_tiet_don_hang_id']);
            $quantity = (float) $item['so_luong_bu'];

            if ($quantity <= 0 || $quantity > (float) $detail->So_luong) {
                throw ValidationException::withMessages([
                    'items' => "Số lượng giao bù sản phẩm #{$detail->Ma_san_pham} không hợp lệ hoặc vượt số lượng đã mua.",
                ]);
            }

            $replacementDetail = ChiTietDonHang::query()->create([
                'Ma_don_hang' => $replacement->Ma_don_hang,
                'Ma_san_pham' => $detail->Ma_san_pham,
                'Ma_ct_flash_sale' => null,
                'So_luong' => $quantity,
                'Don_gia' => 0,
                'Thanh_tien' => 0,
            ]);

            foreach ($this->stock->allocateBatches((int) $detail->Ma_san_pham, $quantity) as $allocation) {
                PhanBoLoHang::query()->create([
                    'Ma_ct_don_hang' => $replacementDetail->Ma_ct_don_hang,
                    'Ma_lo_hang' => $allocation['batch_id'],
                    'So_luong_xuat' => $allocation['quantity'],
                ]);
            }
        }

        ThanhToan::query()->create([
            'Ma_don_hang' => $replacement->Ma_don_hang,
            'Phuong_thuc' => 'Giao_bu',
            'So_tien' => 0,
            'Trang_thai' => 'Thanh_cong',
            'Thoi_gian_thanh_toan' => now(),
        ]);

        return $replacement;
    }
}
