<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Chưa cần đăng ký binding dịch vụ bổ sung tại provider này.
        //
    }

    public function boot(): void
    {
        // Tạo liên kết đặt lại mật khẩu trỏ về trang quên mật khẩu của frontend.
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/forgot-password?token={$token}&email={$notifiable->getEmailForPasswordReset()}";
        });
    }
}