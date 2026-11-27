<?php

/*
 * Lập lịch cronjob tự động sinh đơn định kỳ, hủy đơn quá hạn thanh toán và quét hạn sử dụng lô hàng FEFO.
 */

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Mỗi phút hủy đơn ApiPay đã quá hạn thanh toán; tránh chạy chồng hai lượt.
Schedule::command('orders:expire-pending-payments')
    ->everyMinute()
    ->withoutOverlapping();

// Mỗi giờ cập nhật trạng thái lô theo hạn sử dụng và kết thúc Flash Sale hết giờ.
Schedule::command('inventory:sync-batch-expiry')
    ->hourly()
    ->withoutOverlapping();

// Cấu hình lịch chạy theo khung giờ ban ngày (đang tắt để giữ lại phương án cũ).
// Schedule::command('subscriptions:generate-orders')
//     ->hourlyAt(0)
//     ->between('06:00', '10:00')
//     ->withoutOverlapping();

// Tạm chạy lệnh sinh đơn định kỳ mỗi phút; withoutOverlapping ngăn các lượt đè lên nhau.
Schedule::command('subscriptions:generate-orders')
    ->everyMinute()
    ->withoutOverlapping();