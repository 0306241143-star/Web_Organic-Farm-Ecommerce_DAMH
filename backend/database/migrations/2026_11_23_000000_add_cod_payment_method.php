<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement(
                "ALTER TABLE thanh_toan MODIFY Phuong_thuc ENUM('ApiPay', 'Mien_phi_goi', 'Giao_bu', 'COD') NOT NULL DEFAULT 'ApiPay'"
            );

            return;
        }

        Schema::table('thanh_toan', function (Blueprint $table): void {
            $table->enum('Phuong_thuc', ['ApiPay', 'Mien_phi_goi', 'Giao_bu', 'COD'])
                ->default('ApiPay')
                ->change();
        });
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            if (DB::table('thanh_toan')->where('Phuong_thuc', 'COD')->exists()) {
                throw new \RuntimeException('Cannot remove COD payment method while COD payments exist.');
            }

            Schema::table('thanh_toan', function (Blueprint $table): void {
                $table->enum('Phuong_thuc', ['ApiPay', 'Mien_phi_goi', 'Giao_bu'])
                    ->default('ApiPay')
                    ->change();
            });

            return;
        }

        if (DB::table('thanh_toan')->where('Phuong_thuc', 'COD')->exists()) {
            throw new \RuntimeException('Cannot remove COD payment method while COD payments exist.');
        }

        DB::statement(
            "ALTER TABLE thanh_toan MODIFY Phuong_thuc ENUM('ApiPay', 'Mien_phi_goi', 'Giao_bu') NOT NULL DEFAULT 'ApiPay'"
        );
    }
};
