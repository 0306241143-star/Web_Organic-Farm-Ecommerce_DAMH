<?php

/*
 * Lập lịch cronjob tự động sinh đơn hàng cho gói định kỳ.
 */

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
