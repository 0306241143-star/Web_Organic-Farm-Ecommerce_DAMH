<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ApiPayPaymentMethodMigrationTest extends TestCase
{
    public function test_it_allows_apipay_values_on_non_mysql_databases(): void
    {
        if (Schema::hasTable('Thanh_toan')) {
            $this->markTestSkipped('The application payment table already exists.');
        }

        Schema::create('Thanh_toan', function (Blueprint $table): void {
            $table->id('Ma_thanh_toan');
            $table->enum('Phuong_thuc', ['ApiPay', 'Mien_phi_goi', 'Giao_bu'])->default('ApiPay');
        });

        try {
            $migration = require database_path('migrations/2026_11_16_071000_allow_apipay_payment_method_on_non_mysql.php');
            $migration->up();

            DB::table('Thanh_toan')->insert(['Phuong_thuc' => 'ApiPay']);
            $this->assertDatabaseHas('Thanh_toan', ['Phuong_thuc' => 'ApiPay']);

            $migration->down();
            $this->assertDatabaseHas('Thanh_toan', ['Phuong_thuc' => 'ApiPay']);
        } finally {
            Schema::dropIfExists('Thanh_toan');
        }
    }

    public function test_it_replaces_legacy_provider_values_and_preserves_old_references(): void
    {
        Schema::create('Thanh_toan', function (Blueprint $table): void {
            $table->id('Ma_thanh_toan');
            $table->enum('Phuong_thuc', ['LegacyProvider', 'Mien_phi_goi', 'Giao_bu'])->default('LegacyProvider');
            $table->string('Ma_giao_dich_cu', 100)->nullable()->unique();
        });

        Schema::create('Hoan_tien', function (Blueprint $table): void {
            $table->id('Ma_hoan_tien');
            $table->string('Ma_giao_dich_hoan_cu', 100)->nullable();
        });

        try {
            DB::table('Thanh_toan')->insert([
                'Ma_thanh_toan' => 1,
                'Phuong_thuc' => 'LegacyProvider',
                'Ma_giao_dich_cu' => 'legacy-payment-reference',
            ]);
            DB::table('Hoan_tien')->insert([
                'Ma_hoan_tien' => 1,
                'Ma_giao_dich_hoan_cu' => 'legacy-refund-reference',
            ]);

            $migration = require database_path('migrations/2026_11_16_072000_replace_legacy_payment_provider.php');
            $migration->up();

            $this->assertDatabaseHas('Thanh_toan', [
                'Ma_thanh_toan' => 1,
                'Phuong_thuc' => 'ApiPay',
                'Ma_giao_dich_tham_chieu_cu' => 'legacy-payment-reference',
            ]);
            $this->assertDatabaseHas('Hoan_tien', [
                'Ma_hoan_tien' => 1,
                'Ma_giao_dich_hoan_tham_chieu_cu' => 'legacy-refund-reference',
            ]);
            $this->assertFalse(Schema::hasColumn('Thanh_toan', 'Ma_giao_dich_cu'));
            $this->assertFalse(Schema::hasColumn('Hoan_tien', 'Ma_giao_dich_hoan_cu'));
        } finally {
            Schema::dropIfExists('Hoan_tien');
            Schema::dropIfExists('Thanh_toan');
        }
    }
}
