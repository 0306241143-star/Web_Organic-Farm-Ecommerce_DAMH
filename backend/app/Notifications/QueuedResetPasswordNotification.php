<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Gửi thông báo đặt lại mật khẩu qua hàng đợi để không làm chậm phản hồi đăng nhập.
 */
class QueuedResetPasswordNotification extends ResetPassword implements ShouldQueue
{
    // Cung cấp các thuộc tính/phương thức cần thiết để đưa thông báo vào queue.
    use Queueable;
}