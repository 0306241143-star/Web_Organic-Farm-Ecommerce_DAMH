<?php

/*
 * Luồng quản trị: báo cáo doanh thu, đơn hàng, tỷ lệ canh tác và chỉ số hiệu năng hệ thống (CV04.28).
 */

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NguoiDung;
use App\Traits\ApiResponse;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    use ApiResponse;

    public function dashboard(Request $request): JsonResponse
    {
        // Kiểm tra tham số khoảng thời gian mà quản trị viên gửi lên.
        $validated = $request->validate([
            'period' => ['sometimes', 'string', 'in:7d,30d,90d'],
        ]);

        // Đo thời gian phản hồi và quy đổi khoảng báo cáo thành các ngày dữ liệu.
        $startedAt = microtime(true);
        $period = $validated['period'] ?? '30d';
        $periodDays = ['7d' => 7, '30d' => 30, '90d' => 90][$period];
        $endDate = CarbonImmutable::today();
        $startDate = $endDate->subDays($periodDays - 1);
        $start = $startDate->toDateString();
        $end = $endDate->toDateString();

        // Ưu tiên ngày giao thành công để xác định doanh thu thực tế của từng ngày.
        $completionDate = 'DATE(COALESCE(giao_hang.Ngay_giao_thanh_cong, don_hang.updated_at, don_hang.Ngay_dat))';
        $completedByDay = DB::table('don_hang')
            ->leftJoin('giao_hang', 'giao_hang.Ma_don_hang', '=', 'don_hang.Ma_don_hang')
            ->where('don_hang.Trang_thai', 'Hoan_thanh')
            ->whereRaw("{$completionDate} BETWEEN ? AND ?", [$start, $end])
            ->selectRaw("{$completionDate} as report_date, COUNT(*) as orders, SUM(don_hang.Tong_tien) as revenue")
            ->groupByRaw($completionDate)
            ->get()
            ->keyBy('report_date');

        $ordersByStatus = DB::table('don_hang')
            ->whereDate('Ngay_dat', '>=', $start)
            ->whereDate('Ngay_dat', '<=', $end)
            ->selectRaw('Trang_thai, COUNT(*) as total')
            ->groupBy('Trang_thai')
            ->pluck('total', 'Trang_thai')
            ->map(fn ($total) => (int) $total);

        $harvestByDay = DB::table('lo_hang')
            ->whereBetween('Ngay_thu_hoach', [$start, $end])
            ->selectRaw('DATE(Ngay_thu_hoach) as report_date, SUM(So_luong_thu_hoach) as quantity')
            ->groupByRaw('DATE(Ngay_thu_hoach)')
            ->get()
            ->keyBy('report_date');

        $wastageByType = DB::table('bien_dong_kho')
            ->whereIn('Loai_bien_dong', ['Hao_hut', 'Xuat_huy'])
            ->whereDate('Ngay_ghi_nhan', '>=', $start)
            ->whereDate('Ngay_ghi_nhan', '<=', $end)
            ->selectRaw('Loai_bien_dong, SUM(So_luong) as quantity')
            ->groupBy('Loai_bien_dong')
            ->pluck('quantity', 'Loai_bien_dong')
            ->map(fn ($quantity) => (float) $quantity);

        $wastageByDay = DB::table('bien_dong_kho')
            ->whereIn('Loai_bien_dong', ['Hao_hut', 'Xuat_huy'])
            ->whereDate('Ngay_ghi_nhan', '>=', $start)
            ->whereDate('Ngay_ghi_nhan', '<=', $end)
            ->selectRaw('DATE(Ngay_ghi_nhan) as report_date, SUM(So_luong) as quantity')
            ->groupByRaw('DATE(Ngay_ghi_nhan)')
            ->get()
            ->keyBy('report_date');

        // Điền đủ từng ngày trong khoảng báo cáo để chuỗi dữ liệu không bị khuyết.
        $series = [];
        for ($date = $startDate; $date->lte($endDate); $date = $date->addDay()) {
            $key = $date->toDateString();
            $series[] = [
                'date' => $key,
                'revenue' => (float) ($completedByDay->get($key)->revenue ?? 0),
                'orders' => (int) ($completedByDay->get($key)->orders ?? 0),
                'harvest_quantity' => (float) ($harvestByDay->get($key)->quantity ?? 0),
                'wastage_quantity' => (float) ($wastageByDay->get($key)->quantity ?? 0),
            ];
        }

        $revenueTotal = (float) $completedByDay->sum('revenue');
        $completedOrdersCount = (int) $completedByDay->sum('orders');
        $harvestedQuantity = (float) $harvestByDay->sum('quantity');
        $wastedQuantity = (float) $wastageByType->sum();
        $completedCustomers = DB::table('don_hang')
            ->leftJoin('giao_hang', 'giao_hang.Ma_don_hang', '=', 'don_hang.Ma_don_hang')
            ->where('don_hang.Trang_thai', 'Hoan_thanh')
            ->whereRaw("{$completionDate} BETWEEN ? AND ?", [$start, $end]);
        $uniqueCustomers = (int) (clone $completedCustomers)
            ->distinct()
            ->count('don_hang.Ma_nguoi_dung');
        $repeatCustomers = (int) (clone $completedCustomers)
            ->select('don_hang.Ma_nguoi_dung')
            ->groupBy('Ma_nguoi_dung')
            ->havingRaw('COUNT(*) >= 2')
            ->get()
            ->count();

        $dbConnection = DB::connection()->select('select 1') !== [];

        return $this->successResponse(
            message: 'Lấy báo cáo thống kê thành công.',
            data: [
                'period' => [
                    'key' => $period,
                    'label' => "Trong {$periodDays} ngày gần nhất",
                    'start_date' => $start,
                    'end_date' => $end,
                ],
                'revenue' => [
                    'total' => $revenueTotal,
                    'orders_count' => $completedOrdersCount,
                    'orders_by_status' => $ordersByStatus,
                ],
                'series' => $series,
                'wastage' => [
                    'quantity' => $wastedQuantity,
                    'harvested_quantity' => $harvestedQuantity,
                    'rate' => $harvestedQuantity > 0
                        ? round(($wastedQuantity / $harvestedQuantity) * 100, 2)
                        : null,
                    'by_type' => [
                        'Hao_hut' => (float) ($wastageByType->get('Hao_hut') ?? 0),
                        'Xuat_huy' => (float) ($wastageByType->get('Xuat_huy') ?? 0),
                    ],
                ],
                'customers' => [
                    'unique_customers' => $uniqueCustomers,
                    'repeat_customers' => $repeatCustomers,
                    'repeat_rate' => $uniqueCustomers > 0
                        ? round(($repeatCustomers / $uniqueCustomers) * 100, 2)
                        : null,
                ],
                'farm' => [
                    'active_seasons' => DB::table('mua_vu')->where('Trang_thai', 'Dang_dien_ra')->count(),
                    'total_plots' => DB::table('lo_canh_tac')->count(),
                    'active_plots' => DB::table('lo_canh_tac')->where('Trang_thai', 'Dang_canh_tac')->count(),
                ],
                'users' => [
                    'total' => NguoiDung::count(),
                    'active' => NguoiDung::where('Trang_thai', 'Hoat_dong')->count(),
                ],
                'system_health' => [
                    'api_response_ms' => round((microtime(true) - $startedAt) * 1000, 2),
                    'db_connection' => $dbConnection ? 'connected' : 'disconnected',
                    'status' => $dbConnection ? 'healthy' : 'degraded',
                ],
            ]
        );
    }
}
