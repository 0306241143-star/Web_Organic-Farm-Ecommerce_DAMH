<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dang_ky_goi', function (Blueprint $table) {
            // Chặn tạo hai đăng ký khi trình duyệt retry cùng một yêu cầu sau timeout.
            $table->uuid('Yeu_cau_idempotency')
                ->nullable()
                ->unique('uq_dang_ky_idempotency');
        });
    }

    public function down(): void
    {
        Schema::table('dang_ky_goi', function (Blueprint $table) {
            $table->dropUnique('uq_dang_ky_idempotency');
            $table->dropColumn('Yeu_cau_idempotency');
        });
    }
};
