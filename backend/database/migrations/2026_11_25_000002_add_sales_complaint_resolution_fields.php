<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('khieu_nai', function (Blueprint $table): void {
            $table->dateTime('Ngay_tiep_nhan')->nullable();
            $table->text('Phan_hoi_cskh')->nullable();
            $table->decimal('So_tien_hoan', 12, 2)->nullable();
            $table->unsignedBigInteger('Ma_don_giao_bu')->nullable();
            $table->foreign('Ma_don_giao_bu', 'fk_kn_don_giao_bu')
                ->references('Ma_don_hang')->on('don_hang')->nullOnDelete();
        });

        DB::table('don_hang')
            ->where('Loai_don', 'Giao_bu')
            ->whereNotNull('Ma_khieu_nai')
            ->orderBy('Ma_don_hang')
            ->get(['Ma_don_hang', 'Ma_don_goc', 'Ma_khieu_nai'])
            ->each(function (object $replacement): void {
                DB::table('khieu_nai')
                    ->where('Ma_khieu_nai', $replacement->Ma_khieu_nai)
                    ->where('Ma_don_hang', $replacement->Ma_don_goc)
                    ->where('Hinh_thuc_xu_ly', 'Giao_bu')
                    ->whereNull('Ma_don_giao_bu')
                    ->update(['Ma_don_giao_bu' => $replacement->Ma_don_hang]);
            });
    }

    public function down(): void
    {
        Schema::table('khieu_nai', function (Blueprint $table): void {
            $table->dropForeign('fk_kn_don_giao_bu');
            $table->dropColumn([
                'Ngay_tiep_nhan',
                'Phan_hoi_cskh',
                'So_tien_hoan',
                'Ma_don_giao_bu',
            ]);
        });
    }
};
