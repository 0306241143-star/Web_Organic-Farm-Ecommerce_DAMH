<?php

/*
 * Luồng khách hàng: xem ví điểm thưởng và quy đổi điểm ưu đãi.
 */

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Services\RewardPointService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RewardPointController extends Controller
{
    use ApiResponse;

    public function index(Request $request, RewardPointService $rewards): JsonResponse
    {
        $userId = (int) $request->user()->getAuthIdentifier();
        $balance = max(0, $rewards->balance($userId));
        $conversionRate = $rewards->conversionRate();

        return $this->successResponse(
            message: 'Lấy số dư điểm thưởng thành công.',
            data: [
                'points_available' => $balance,
                'conversion_rate' => $conversionRate,
                'maximum_discount' => $balance * $conversionRate,
            ]
        );
    }
}
