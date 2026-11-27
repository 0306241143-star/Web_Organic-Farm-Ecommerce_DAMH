<?php

namespace App\Services;

use App\Models\DiemTichLuy;
use App\Models\DonHang;
use App\Models\NguoiDung;
use Illuminate\Support\Facades\DB;

class RewardPointService
{
    public function conversionRate(): int
    {
        // Đọc quy đổi điểm từ cấu hình hệ thống để thống nhất với checkout.
        $configuredRate = DB::table('cau_hinh_he_thong')
            ->where('Khoa', 'diem_quy_doi_vnd')
            ->value('Gia_tri');

        return is_numeric($configuredRate) && (int) $configuredRate > 0
            ? (int) $configuredRate
            : 1000;
    }

    public function balance(int $userId): int
    {
        // Cộng dồn điểm cộng và trừ để lấy số dư hiện tại.
        return (int) DiemTichLuy::query()
            ->where('Ma_nguoi_dung', $userId)
            ->sum('So_diem');
    }

    /**
     * Locking the account serializes redemptions across concurrent checkouts.
     */
    public function lockCustomer(int $userId): NguoiDung
    {
        // Khóa tài khoản trong transaction để hai lượt đổi điểm không vượt số dư.
        return NguoiDung::query()
            ->whereKey($userId)
            ->lockForUpdate()
            ->firstOrFail();
    }

    public function calculateRedemption(int $requestedPoints, int $availablePoints, float $subtotal): array
    {
        // Giới hạn điểm dùng bởi số dư, yêu cầu và tổng tiền có thể quy đổi.
        $rate = $this->conversionRate();
        $maxDiscountablePoints = (int) ceil(max(0, $subtotal) / $rate);
        $pointsToUse = min(max(0, $requestedPoints), max(0, $availablePoints), $maxDiscountablePoints);
        $discount = min((float) $subtotal, $pointsToUse * $rate);

        return [
            'points_to_use' => $pointsToUse,
            'points_discount' => $discount,
            'conversion_rate' => $rate,
        ];
    }

    public function recordRedemption(int $userId, DonHang $order, int $points): void
    {
        if ($points <= 0) {
            return;
        }

        DiemTichLuy::query()->create([
            'Ma_nguoi_dung' => $userId,
            'Ma_don_hang' => $order->Ma_don_hang,
            'Loai_giao_dich' => 'Su_dung',
            'So_diem' => -$points,
            'Mo_ta' => "Sử dụng {$points} điểm cho đơn hàng #{$order->Ma_don_hang}",
        ]);
    }

    /**
     * Return spent points once when an order is cancelled or expires.
     */
    public function refundOrderPoints(DonHang $order): int
    {
        // Không hoàn lại nếu đơn không ghi nhận điểm đã sử dụng.
        if ((int) $order->So_diem_su_dung <= 0) {
            return 0;
        }

        $alreadyRefunded = DiemTichLuy::query()
            ->where('Ma_don_hang', $order->Ma_don_hang)
            ->where('Loai_giao_dich', 'Hoan_diem')
            ->exists();

        if ($alreadyRefunded) {
            return 0;
        }

        $points = (int) $order->So_diem_su_dung;
        DiemTichLuy::query()->create([
            'Ma_nguoi_dung' => $order->Ma_nguoi_dung,
            'Ma_don_hang' => $order->Ma_don_hang,
            'Loai_giao_dich' => 'Hoan_diem',
            'So_diem' => $points,
            'Mo_ta' => "Hoàn {$points} điểm do đơn hàng #{$order->Ma_don_hang} bị hủy",
        ]);

        return $points;
    }
}
