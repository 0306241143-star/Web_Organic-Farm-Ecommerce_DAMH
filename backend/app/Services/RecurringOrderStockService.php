<?php

namespace App\Services;

use App\Models\ChiTietDonHang;
use App\Models\DonHang;
use App\Models\PhanBoLoHang;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class RecurringOrderStockService
{
    private const DELIVERY_MARKER_PATTERN = '/\[\[RECURRING_DELIVERY:(\d{4}-\d{2}-\d{2})\]\]/';

    public function __construct(private FefoStockService $stock) {}

    public function availableDeliveryDate(DonHang $order): ?CarbonImmutable
    {
        if (preg_match(self::DELIVERY_MARKER_PATTERN, (string) $order->Ghi_chu, $matches) !== 1) {
            return null;
        }

        return CarbonImmutable::createFromFormat('!Y-m-d', $matches[1]);
    }

    public function visibleNote(?string $note): ?string
    {
        $cleanNote = trim((string) preg_replace(self::DELIVERY_MARKER_PATTERN, '', (string) $note));

        return $cleanNote === '' ? null : $cleanNote;
    }

    public function postpone(DonHang $order): CarbonImmutable
    {
        $nextDeliveryDate = CarbonImmutable::parse($order->Ngay_dat)->startOfDay()->addWeek();
        while ($nextDeliveryDate->lessThanOrEqualTo(CarbonImmutable::today())) {
            $nextDeliveryDate = $nextDeliveryDate->addWeek();
        }

        $note = $this->visibleNote($order->Ghi_chu);
        $order->Ghi_chu = trim(($note ? $note.' ' : '').'[[RECURRING_DELIVERY:'.$nextDeliveryDate->toDateString().']]');
        $order->save();

        return $nextDeliveryDate;
    }

    /**
     * @return array<int, array{detail_id: int, product_id: int, product_name: string, unit: ?string, missing_quantity: float}>
     */
    public function shortagesForOrder(DonHang $order): array
    {
        $order->loadMissing('chiTiets.sanPham', 'chiTiets.phanBoLoHangs');
        $details = $order->chiTiets;
        $availableByProduct = [];
        $shortages = [];

        foreach ($details as $detail) {
            $productId = (int) $detail->Ma_san_pham;
            $allocated = (float) $detail->phanBoLoHangs->sum('So_luong_xuat');
            $remaining = round(max(0, (float) $detail->So_luong - $allocated), 2);
            if ($remaining <= 0) {
                continue;
            }

            if (! array_key_exists($productId, $availableByProduct)) {
                $availableByProduct[$productId] = $this->stock->availableQuantity($productId);
            }

            $covered = min($remaining, $availableByProduct[$productId]);
            $availableByProduct[$productId] = round($availableByProduct[$productId] - $covered, 2);
            $missing = round($remaining - $covered, 2);
            if ($missing > 0) {
                $shortages[] = [
                    'detail_id' => (int) $detail->Ma_ct_don_hang,
                    'product_id' => $productId,
                    'product_name' => $detail->sanPham?->Ten_san_pham ?? 'Sản phẩm đã ngừng kinh doanh',
                    'unit' => $detail->sanPham?->Don_vi_tinh,
                    'missing_quantity' => $missing,
                ];
            }
        }

        return $shortages;
    }

    /**
     * @return array{postponed_until: ?string, items: array<int, array<string, mixed>>}|null
     */
    public function alertForOrder(DonHang $order): ?array
    {
        $items = $this->shortagesForOrder($order);
        $deliveryDate = $this->availableDeliveryDate($order);
        $hasFuturePostponement = $deliveryDate !== null
            && $deliveryDate->isAfter(CarbonImmutable::today());

        if ($items === [] && ! $hasFuturePostponement) {
            return null;
        }

        return [
            'postponed_until' => $deliveryDate?->toDateString(),
            'items' => $items,
        ];
    }

    public function tryAllocateOrder(DonHang $order): bool
    {
        return DB::transaction(function () use ($order): bool {
            $lockedOrder = DonHang::query()
                ->whereKey($order->Ma_don_hang)
                ->lockForUpdate()
                ->first();

            if (
                ! $lockedOrder
                || $lockedOrder->Loai_don !== 'Dinh_ky'
                || $lockedOrder->Trang_thai !== 'Cho_xac_nhan'
            ) {
                return false;
            }

            $details = ChiTietDonHang::query()
                ->where('Ma_don_hang', $lockedOrder->Ma_don_hang)
                ->lockForUpdate()
                ->get();
            $requiredByProduct = [];

            foreach ($details as $detail) {
                $allocated = (float) PhanBoLoHang::query()
                    ->where('Ma_ct_don_hang', $detail->Ma_ct_don_hang)
                    ->sum('So_luong_xuat');
                $remaining = round(max(0, (float) $detail->So_luong - $allocated), 2);
                if ($remaining > 0) {
                    $productId = (int) $detail->Ma_san_pham;
                    $requiredByProduct[$productId] = round(($requiredByProduct[$productId] ?? 0) + $remaining, 2);
                }
            }

            foreach ($requiredByProduct as $productId => $required) {
                if ($this->stock->availableQuantity((int) $productId, true) < $required) {
                    return false;
                }
            }

            foreach ($details as $detail) {
                $allocated = (float) PhanBoLoHang::query()
                    ->where('Ma_ct_don_hang', $detail->Ma_ct_don_hang)
                    ->sum('So_luong_xuat');
                $remaining = round(max(0, (float) $detail->So_luong - $allocated), 2);
                if ($remaining <= 0) {
                    continue;
                }

                foreach ($this->stock->allocateBatches((int) $detail->Ma_san_pham, $remaining) as $allocation) {
                    PhanBoLoHang::query()->create([
                        'Ma_ct_don_hang' => $detail->Ma_ct_don_hang,
                        'Ma_lo_hang' => $allocation['batch_id'],
                        'So_luong_xuat' => $allocation['quantity'],
                    ]);
                }
            }

            return true;
        });
    }
}
