<?php

/*
 * Lệnh chạy định kỳ để sinh đơn hàng cho các gói tháng.
 * Logic xử lý sẽ được triển khai sau.
 */

namespace App\Console\Commands;

use Illuminate\Console\Command;

class GenerateRecurringOrders extends Command
{
    protected $signature = 'subscriptions:generate-orders';

    protected $description = 'Tạo đơn hàng đến kỳ giao của các gói định kỳ';

    public function handle(): int
    {
        $this->error('Logic tạo đơn định kỳ chưa được triển khai.');

        return self::FAILURE;
    }
}
