<?php

/*
 * Dịch vụ gọi Google Maps Distance Matrix API để tính khoảng cách và phí giao hàng.
 */

namespace App\Services;

use App\Models\DiaChiGiaoHang;
use App\Models\NongTrai;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class ShippingDistanceService
{
    /**
     * Lấy lộ trình lái xe từ nông trại trung tâm tới địa chỉ giao hàng.
     */
    public function estimate(DiaChiGiaoHang $address): array
    {
        // Đọc đơn giá vận chuyển chung để áp dụng thống nhất cho mọi tuyến.
        $configuredPrice = DB::table('cau_hinh_he_thong')
            ->where('Khoa', 'don_gia_ship_km')
            ->value('Gia_tri');
        $pricePerKm = $configuredPrice === null
            ? (float) config('services.shipping.price_per_km', 2000)
            : (float) $configuredPrice;
        $farm = NongTrai::query()->orderBy('Ma_nong_trai')->first();

        if ($pricePerKm <= 0 || ! is_finite($pricePerKm)) {
            throw new RuntimeException('Đơn giá giao hàng theo km chưa được cấu hình hợp lệ.');
        }

        $originName = filled($farm?->Ten_nong_trai)
            ? (string) $farm->Ten_nong_trai
            : (string) config('services.shipping.origin_name', 'Điểm xuất phát giao hàng');

        $originLatitude = is_numeric($farm?->Vi_do)
            ? $farm->Vi_do
            : config('services.shipping.origin_latitude');

        $originLongitude = is_numeric($farm?->Kinh_do)
            ? $farm->Kinh_do
            : config('services.shipping.origin_longitude');
            
        $apiKey = (string) config('services.goong.api_key', '');
        $endpoint = (string) config('services.goong.distance_matrix_url', '');

        if (
            $apiKey !== ''
            && $endpoint !== ''
            && is_numeric($originLatitude)
            && is_numeric($originLongitude)
            && is_numeric($address->Vi_do)
            && is_numeric($address->Kinh_do)
        ) {
            try {
                // Gọi Goong để lấy độ dài tuyến lái xe thay vì dùng khoảng cách chim bay.
                $response = Http::acceptJson()
                    ->timeout(10)
                    ->get($endpoint, [
                        'origins' => $originLatitude.','.$originLongitude,
                        'destinations' => $address->Vi_do.','.$address->Kinh_do,
                        'vehicle' => 'car',
                        'api_key' => $apiKey,
                    ]);

                $element = $response->successful() ? $response->json('rows.0.elements.0') : null;
                $meters = is_array($element) ? ($element['distance']['value'] ?? null) : null;

                if (
                    is_array($element)
                    && ($element['status'] ?? null) === 'OK'
                    && is_numeric($meters)
                    && (float) $meters > 0
                ) {
                    $distanceKm = round(((float) $meters) / 1000, 2);

                    // Trả về khoảng cách thực tế cùng chi phí đã làm tròn theo km.
                    return [
                        'distance_km' => $distanceKm,
                        'shipping_fee' => (int) round($distanceKm * $pricePerKm),
                        'price_per_km' => $pricePerKm,
                        'origin_name' => $originName,
                    ];
                }

                Log::warning('Goong Maps returned no usable route; using fallback distance.', [
                    'http_status' => $response->status(),
                    'address_id' => $address->Ma_dia_chi,
                ]);
            } catch (Throwable $exception) {
                // Do not log the exception message; HTTP exceptions may include the API key in the URL.
                Log::warning('Goong Maps unavailable; using fallback distance.', [
                    'exception' => $exception::class,
                    'address_id' => $address->Ma_dia_chi,
                ]);
            }
        }

        $distanceKm = $this->estimateFallbackDistanceKm(
            is_numeric($originLatitude) ? (float) $originLatitude : null,
            is_numeric($originLongitude) ? (float) $originLongitude : null,
            $address
        );

        // Khi dịch vụ bản đồ lỗi, vẫn trả kết quả ước tính để checkout không chặn.
        return [
            'distance_km' => $distanceKm,
            'shipping_fee' => (int) round($distanceKm * $pricePerKm),
            'price_per_km' => $pricePerKm,
            'origin_name' => $originName,
        ];
    }

    private function estimateFallbackDistanceKm(
        ?float $originLatitude,
        ?float $originLongitude,
        DiaChiGiaoHang $address
    ): float
    {
        if (
            $originLatitude === null
            || $originLongitude === null
            || ! is_numeric($address->Vi_do)
            || ! is_numeric($address->Kinh_do)
        ) {
            return 12.5;
        }

        $latitude1 = deg2rad($originLatitude);
        $longitude1 = deg2rad($originLongitude);
        $latitude2 = deg2rad((float) $address->Vi_do);
        $longitude2 = deg2rad((float) $address->Kinh_do);
        $latitudeDelta = $latitude2 - $latitude1;
        $longitudeDelta = $longitude2 - $longitude1;
        $haversine = sin($latitudeDelta / 2) ** 2
            + cos($latitude1) * cos($latitude2) * sin($longitudeDelta / 2) ** 2;
        $straightDistanceKm = 6371 * 2 * asin(min(1.0, sqrt($haversine)));

        return max(1.0, round($straightDistanceKm * 1.3, 2));
    }
}
