<?php

namespace Tests\Unit;

use App\Services\FefoStockService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FefoStockServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_it_allocates_earliest_expiring_batches_first_and_skips_expired_batches(): void
    {
        $plot = DB::table('lo_canh_tac')->orderBy('Ma_lo_canh_tac')->first();
        $staffId = (int) DB::table('nguoi_dung')->where('Ma_vai_tro', 3)->value('Ma_nguoi_dung');
        $this->assertNotNull($plot);
        $this->assertGreaterThan(0, $staffId);

        $productPlots = DB::table('lo_canh_tac')
            ->where('Ma_san_pham', $plot->Ma_san_pham)
            ->select('Ma_lo_canh_tac');
        DB::table('lo_hang')
            ->whereIn('Ma_lo_canh_tac', $productPlots)
            ->update(['So_luong_con_lai' => 0, 'Trang_thai' => 'Het_hang']);

        $expiredBatchId = $this->createBatch($plot->Ma_lo_canh_tac, $staffId, now()->subDay()->toDateString(), 10);
        $firstExpiryBatchId = $this->createBatch($plot->Ma_lo_canh_tac, $staffId, now()->addDay()->toDateString(), 2);
        $laterExpiryBatchId = $this->createBatch($plot->Ma_lo_canh_tac, $staffId, now()->addDays(5)->toDateString(), 5);

        $allocations = app(FefoStockService::class)->allocateBatches((int) $plot->Ma_san_pham, 5);

        $this->assertSame([
            ['batch_id' => $firstExpiryBatchId, 'quantity' => 2.0],
            ['batch_id' => $laterExpiryBatchId, 'quantity' => 3.0],
        ], $allocations);
        $this->assertSame(10.0, (float) DB::table('lo_hang')
            ->where('Ma_lo_hang', $expiredBatchId)
            ->value('So_luong_con_lai'));
        $this->assertSame(0.0, (float) DB::table('lo_hang')
            ->where('Ma_lo_hang', $firstExpiryBatchId)
            ->value('So_luong_con_lai'));
        $this->assertSame(2.0, (float) DB::table('lo_hang')
            ->where('Ma_lo_hang', $laterExpiryBatchId)
            ->value('So_luong_con_lai'));
    }

    private function createBatch(int $plotId, int $staffId, string $expiryDate, float $quantity): int
    {
        return (int) DB::table('lo_hang')->insertGetId([
            'Ma_lo_canh_tac' => $plotId,
            'Ma_nhan_vien_phu_trach' => $staffId,
            'Ngay_thu_hoach' => now()->subDays(2)->toDateString(),
            'Han_su_dung' => $expiryDate,
            'So_luong_thu_hoach' => $quantity,
            'So_luong_con_lai' => $quantity,
            'Trang_thai' => 'Con_hang',
        ], 'Ma_lo_hang');
    }
}
