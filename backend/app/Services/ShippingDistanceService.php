<?php

/*
 * Dịch vụ gọi Google Maps Distance Matrix API để tính khoảng cách và phí giao hàng.
 */

namespace App\Services;

use App\Models\DiaChiGiaoHang;
use App\Models\NongTrai;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class ShippingDistanceService
{
    /**
     * Lấy lộ trình lái xe từ nông trại trung tâm tới địa chỉ giao hàng.
     */
    public function estimate(DiaChiGiaoHang $address): array
    {
        $apiKey = config('services.goong.api_key');
        $endpoint = config('services.goong.distance_matrix_url');
        $configuredPrice = DB::table('cau_hinh_he_thong')
            ->where('Khoa', 'don_gia_ship_km')
            ->value('Gia_tri');
        $pricePerKm = $configuredPrice === null
            ? (float) config('services.shipping.price_per_km')
            : (float) $configuredPrice;
        $farm = NongTrai::query()->orderBy('Ma_nong_trai')->first();

        if (! is_string($apiKey) || $apiKey === '' || ! is_string($endpoint) || $endpoint === '') {
            throw new RuntimeException('Dịch vụ tính khoảng cách chưa được cấu hình.');
        }

        if ($pricePerKm <= 0 || ! is_finite($pricePerKm)) {
            throw new RuntimeException('Đơn giá giao hàng theo km chưa được cấu hình hợp lệ.');
        }

        if (! $farm || ! is_numeric($farm->Vi_do) || ! is_numeric($farm->Kinh_do)) {
            throw new RuntimeException('Chưa cấu hình tọa độ nông trại giao hàng.');
        }

        $response = Http::acceptJson()
            ->timeout(15)
            ->get($endpoint, [
                'origins' => $farm->Vi_do.','.$farm->Kinh_do,
                'destinations' => $address->Vi_do.','.$address->Kinh_do,
                'vehicle' => 'car',
                'api_key' => $apiKey,
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Dịch vụ tính khoảng cách phản hồi lỗi.');
        }

        $element = $response->json('rows.0.elements.0');
        $meters = is_array($element) ? ($element['distance']['value'] ?? null) : null;

        if (
            ! is_array($element)
            || ($element['status'] ?? null) !== 'OK'
            || ! is_numeric($meters)
            || (float) $meters <= 0
        ) {
            throw new RuntimeException('Không tìm được lộ trình giao hàng hợp lệ tới địa chỉ đã chọn.');
        }

        $distanceKm = round(((float) $meters) / 1000, 2);

        return [
            'distance_km' => $distanceKm,
            'shipping_fee' => (int) round($distanceKm * $pricePerKm),
            'price_per_km' => $pricePerKm,
            'origin_name' => $farm->Ten_nong_trai,
        ];
    }
}
