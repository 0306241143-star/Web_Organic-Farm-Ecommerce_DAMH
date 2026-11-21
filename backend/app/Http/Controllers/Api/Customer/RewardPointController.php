<?php

/* ==========================================================================
 * BỘ ĐIỀU KHIỂN VÍ ĐIỂM THƯỞNG KHÁCH HÀNG (REWARD POINT CONTROLLER)
 * Phục vụ nghiệp vụ hiển thị số dư điểm tích lũy, quy tắc quy đổi
 * và bảng lịch sử giao dịch điểm chi tiết từ CSDL.
 * ========================================================================== */

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\DiemTichLuy;
use App\Services\RewardPointService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RewardPointController extends Controller
{
    use ApiResponse;

    /**
     * Lấy tổng số dư điểm tích lũy, quy tắc quy đổi và lịch sử giao dịch điểm.
     */
    public function index(Request $request, RewardPointService $rewards): JsonResponse
    {
        $userId = $request->user()->getAuthIdentifier();
        $totalPoints = $rewards->balance((int) $userId);
        $conversionRate = $rewards->conversionRate();

        // 2. Quy tắc quy đổi và tích lũy điểm thưởng hệ thống
        $conversionRules = [
            'point_to_vnd' => $conversionRate,
            'points_label' => '1 điểm thưởng = '.number_format($conversionRate, 0, ',', '.').' VNĐ khi thanh toán đơn hàng.',
            'earn_rule'    => 'Điểm được cộng tự động khi đơn hàng mua lẻ hoặc gói định kỳ giao thành công.',
            'redeem_rule'  => 'Điểm được trừ trực tiếp vào tổng tiền thanh toán khi áp dụng ưu đãi.',
            'refund_rule'  => 'Điểm đã sử dụng sẽ được hoàn lại đầy đủ nếu đơn hàng bị hủy hoặc có sự cố.',
        ];

        // 3. Lấy bảng lịch sử giao dịch tích điểm và trừ điểm thực tế từ CSDL
        $history = DiemTichLuy::query()
            ->where('Ma_nguoi_dung', $userId)
            ->orderByDesc('created_at')
            ->orderByDesc('Ma_gd_diem')
            ->paginate(min(max((int) $request->query('per_page', 50), 1), 100))
            ->through(function (DiemTichLuy $item) {
                $typeLabel = match ($item->Loai_giao_dich) {
                    'Tich_diem' => 'Cộng điểm',
                    'Su_dung'   => 'Trừ điểm',
                    'Hoan_diem' => 'Hoàn điểm',
                    default     => 'Biến động điểm',
                };

                return [
                    'id'               => (int) $item->Ma_gd_diem,
                    'order_id'         => $item->Ma_don_hang ? (int) $item->Ma_don_hang : null,
                    'transaction_type' => $item->Loai_giao_dich,
                    'type_label'       => $typeLabel,
                    'points'           => (int) $item->So_diem,
                    'description'      => $item->Mo_ta ?? 'Giao dịch điểm tích lũy',
                    'created_at'       => $item->created_at ? $item->created_at->format('d/m/Y H:i') : null,
                ];
            });

        return $this->successResponse('Lấy thông tin ví điểm thưởng thành công.', [
            'total_points'     => $totalPoints,
            'conversion_rules' => $conversionRules,
            'history' => $history->items(),
        ], meta: [
            'history' => [
                'current_page' => $history->currentPage(),
                'per_page' => $history->perPage(),
                'total' => $history->total(),
                'last_page' => $history->lastPage(),
            ],
        ]);
    }
}
