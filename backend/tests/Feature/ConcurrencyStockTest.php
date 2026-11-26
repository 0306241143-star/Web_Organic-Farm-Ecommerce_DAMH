<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class ConcurrencyStockTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Artisan::call('migrate:fresh', ['--seed' => true]);
    }

    public function test_concurrent_order_confirmations_never_overdraw_a_shared_batch(): void
    {
        $driver = DB::connection()->getDriverName();
        if (! in_array($driver, ['mysql', 'pgsql'], true)) {
            $this->markTestSkipped('Real row-lock concurrency requires MySQL or PostgreSQL.');
        }

        $plot = DB::table('lo_canh_tac')->orderBy('Ma_lo_canh_tac')->first();
        $this->assertNotNull($plot);
        $productId = (int) $plot->Ma_san_pham;
        $salesId = (int) DB::table('nguoi_dung')->where('Ma_vai_tro', 2)->value('Ma_nguoi_dung');
        $customerId = (int) DB::table('nguoi_dung')->where('Ma_vai_tro', 4)->value('Ma_nguoi_dung');
        $addressId = (int) DB::table('dia_chi_giao_hang')
            ->where('Ma_nguoi_dung', $customerId)
            ->value('Ma_dia_chi');
        $this->assertGreaterThan(0, $salesId);
        $this->assertGreaterThan(0, $customerId);
        $this->assertGreaterThan(0, $addressId);

        $productPlots = DB::table('lo_canh_tac')
            ->where('Ma_san_pham', $productId)
            ->select('Ma_lo_canh_tac');
        DB::table('lo_hang')
            ->whereIn('Ma_lo_canh_tac', $productPlots)
            ->update(['So_luong_con_lai' => 0, 'Trang_thai' => 'Het_hang']);

        $batchId = (int) DB::table('lo_hang')->insertGetId([
            'Ma_lo_canh_tac' => $plot->Ma_lo_canh_tac,
            'Ma_nhan_vien_phu_trach' => $salesId,
            'Ngay_thu_hoach' => now()->subDay()->toDateString(),
            'Han_su_dung' => now()->addDays(5)->toDateString(),
            'So_luong_thu_hoach' => 1,
            'So_luong_con_lai' => 1,
            'Trang_thai' => 'Con_hang',
        ], 'Ma_lo_hang');

        $orderIds = [];
        for ($index = 0; $index < 4; $index++) {
            $orderIds[] = $this->createPendingOrder($customerId, $addressId, $productId);
        }

        $connectionConfig = config('database.connections.'.DB::getDefaultConnection());
        $workerData = [
            'base_path' => base_path(),
            'connection' => $connectionConfig,
            'staff_id' => $salesId,
        ];
        $workerScript = <<<'PHP'
$data = json_decode(base64_decode($argv[1]), true, 512, JSON_THROW_ON_ERROR);
require $data['base_path'] . '/vendor/autoload.php';
$app = require $data['base_path'] . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
config(['database.connections.concurrent_worker' => $data['connection']]);
Illuminate\Support\Facades\DB::setDefaultConnection('concurrent_worker');
Illuminate\Support\Facades\DB::purge('concurrent_worker');
file_put_contents($argv[2], 'ready');
$deadline = microtime(true) + 15;
while (! is_file($argv[3]) && microtime(true) < $deadline) {
    usleep(10000);
}
if (! is_file($argv[3])) {
    fwrite(STDERR, 'Timed out waiting for the start signal.');
    exit(2);
}
try {
    app(App\Services\Order\SalesOrderProcessingService::class)->confirmOrder((int) $argv[4], (int) $data['staff_id']);
    echo 'confirmed';
} catch (Illuminate\Validation\ValidationException $exception) {
    echo 'rejected';
}
PHP;

        $barrier = tempnam(sys_get_temp_dir(), 'stock-race-');
        if ($barrier === false) {
            $this->fail('Could not create a temporary concurrency barrier.');
        }
        unlink($barrier);
        $startFile = $barrier.'.start';
        $readyFiles = [];
        $workers = [];

        try {
            foreach ($orderIds as $index => $orderId) {
                $readyFiles[$index] = $barrier.'.'.$index;
                $encodedData = base64_encode(json_encode($workerData, JSON_THROW_ON_ERROR));
                $workers[] = new Process([
                    PHP_BINARY,
                    '-r',
                    $workerScript,
                    $encodedData,
                    $readyFiles[$index],
                    $startFile,
                    (string) $orderId,
                ], base_path());
                $workers[$index]->setTimeout(30);
                $workers[$index]->start();
            }

            $readyDeadline = microtime(true) + 15;
            while (
                count(array_filter($readyFiles, 'is_file')) < count($readyFiles)
                && microtime(true) < $readyDeadline
                && count(array_filter($workers, fn (Process $worker): bool => $worker->isRunning())) === count($workers)
            ) {
                usleep(10000);
            }

            foreach ($readyFiles as $readyFile) {
                $this->assertFileExists($readyFile, 'A worker did not reach the concurrency barrier.');
            }
            file_put_contents($startFile, 'go');

            foreach ($workers as $worker) {
                $worker->wait();
                $worker->checkSuccessful();
            }
        } finally {
            if (! is_file($startFile)) {
                file_put_contents($startFile, 'release');
            }
            foreach ($workers as $worker) {
                if ($worker->isRunning()) {
                    $worker->stop();
                }
            }
            foreach (array_merge([$startFile], $readyFiles) as $temporaryFile) {
                if (is_file($temporaryFile)) {
                    unlink($temporaryFile);
                }
            }
        }

        $results = array_map(fn (Process $worker): string => trim($worker->getOutput()), $workers);
        sort($results);
        $this->assertSame(['confirmed', 'rejected', 'rejected', 'rejected'], $results);

        $remainingStock = (float) DB::table('lo_hang')->where('Ma_lo_hang', $batchId)->value('So_luong_con_lai');
        $allocatedStock = (float) DB::table('phan_bo_lo_hang')
            ->where('Ma_lo_hang', $batchId)
            ->sum('So_luong_xuat');
        $this->assertSame(0.0, $remainingStock);
        $this->assertSame(1.0, $allocatedStock);
        $this->assertSame(1.0, $remainingStock + $allocatedStock);
        $this->assertSame(0, DB::table('lo_hang')
            ->where('Ma_lo_hang', $batchId)
            ->where('So_luong_con_lai', '<', 0)
            ->count());
    }

    private function createPendingOrder(int $customerId, int $addressId, int $productId): int
    {
        $orderId = (int) DB::table('don_hang')->insertGetId([
            'Ma_nguoi_dung' => $customerId,
            'Ma_dia_chi' => $addressId,
            'Loai_don' => 'Mua_le',
            'Ngay_dat' => now(),
            'Tien_hang' => 100,
            'Tong_tien' => 100,
            'Trang_thai' => 'Cho_xac_nhan',
        ], 'Ma_don_hang');

        DB::table('chi_tiet_don_hang')->insert([
            'Ma_don_hang' => $orderId,
            'Ma_san_pham' => $productId,
            'So_luong' => 1,
            'Don_gia' => 100,
            'Thanh_tien' => 100,
        ]);
        DB::table('thanh_toan')->insert([
            'Ma_don_hang' => $orderId,
            'Phuong_thuc' => 'COD',
            'So_tien' => 100,
            'Trang_thai' => 'Khoi_tao',
        ]);

        return $orderId;
    }
}
