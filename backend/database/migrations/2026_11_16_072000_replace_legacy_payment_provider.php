<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('Thanh_toan')) {
            return;
        }

        Schema::table('Thanh_toan', function (Blueprint $table): void {
            $table->string('Phuong_thuc')->default('ApiPay')->change();
        });

        DB::table('Thanh_toan')
            ->whereNotIn('Phuong_thuc', ['ApiPay', 'Mien_phi_goi', 'Giao_bu'])
            ->update(['Phuong_thuc' => 'ApiPay']);

        $this->archiveAndDropLegacyColumns(
            'Thanh_toan',
            'Ma_thanh_toan',
            'Ma_giao_dich_',
            'Ma_giao_dich_apipay',
            'Ma_giao_dich_tham_chieu_cu'
        );
        $this->archiveAndDropLegacyColumns(
            'Hoan_tien',
            'Ma_hoan_tien',
            'Ma_giao_dich_hoan_',
            'Ma_giao_dich_hoan_apipay',
            'Ma_giao_dich_hoan_tham_chieu_cu'
        );

        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement(
                'ALTER TABLE `Thanh_toan` MODIFY `Phuong_thuc` '
                ."ENUM('ApiPay', 'Mien_phi_goi', 'Giao_bu') NOT NULL DEFAULT 'ApiPay'"
            );
        } else {
            Schema::table('Thanh_toan', function (Blueprint $table): void {
                $table->enum('Phuong_thuc', ['ApiPay', 'Mien_phi_goi', 'Giao_bu'])
                    ->default('ApiPay')
                    ->change();
            });
        }
    }

    public function down(): void {}

    private function archiveAndDropLegacyColumns(
        string $table,
        string $primaryKey,
        string $legacyColumnPrefix,
        string $activeColumn,
        string $archiveColumn
    ): void {
        if (! Schema::hasTable($table)) {
            return;
        }

        $legacyColumns = array_values(array_filter(
            Schema::getColumnListing($table),
            fn (string $column): bool => str_starts_with($column, $legacyColumnPrefix)
                && $column !== $activeColumn
                && $column !== $archiveColumn
        ));

        foreach ($legacyColumns as $legacyColumn) {
            $this->archiveAndDropColumn($table, $primaryKey, $legacyColumn, $archiveColumn);
        }
    }

    private function archiveAndDropColumn(
        string $table,
        string $primaryKey,
        string $legacyColumn,
        string $archiveColumn
    ): void {
        if (! Schema::hasColumn($table, $archiveColumn)) {
            Schema::table($table, function (Blueprint $blueprint) use ($archiveColumn): void {
                $blueprint->string($archiveColumn, 100)->nullable();
            });
        }

        DB::table($table)
            ->whereNotNull($legacyColumn)
            ->orderBy($primaryKey)
            ->chunkById(100, function ($records) use ($table, $primaryKey, $legacyColumn, $archiveColumn): void {
                foreach ($records as $record) {
                    if ($record->{$archiveColumn} !== null) {
                        continue;
                    }

                    DB::table($table)
                        ->where($primaryKey, $record->{$primaryKey})
                        ->update([$archiveColumn => $record->{$legacyColumn}]);
                }
            }, $primaryKey);

        $uniqueIndex = null;
        foreach (Schema::getIndexes($table) as $index) {
            if (($index['unique'] ?? false) && ($index['columns'] ?? []) === [$legacyColumn]) {
                $uniqueIndex = $index['name'];
                break;
            }
        }

        Schema::table($table, function (Blueprint $blueprint) use ($legacyColumn, $uniqueIndex): void {
            if ($uniqueIndex !== null) {
                $blueprint->dropUnique($uniqueIndex);
            }
            $blueprint->dropColumn($legacyColumn);
        });
    }
};
