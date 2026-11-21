<?php

/*
 * Resolve customer-entered delivery addresses to coordinates used by shipping calculations.
 */

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class GoongGeocodingService
{
    /**
     * Geocode a full address on the server so clients cannot submit fabricated coordinates.
     *
     * @return array{latitude: float, longitude: float}
     */
    public function geocode(string $address): array
    {
        $apiKey = config('services.goong.api_key');
        $endpoint = config('services.goong.geocoding_url');

        if (! is_string($apiKey) || $apiKey === '' || ! is_string($endpoint) || $endpoint === '') {
            throw new RuntimeException('Goong Geocoding is not configured.');
        }

        $response = Http::acceptJson()
            ->timeout(10)
            ->get($endpoint, [
                'address' => $address,
                'api_key' => $apiKey,
            ]);

        if ($response->failed()) {
            throw new RuntimeException('Goong Geocoding returned HTTP status '.$response->status().'.');
        }

        $location = $response->json('results.0.geometry.location');
        $latitude = is_array($location) ? ($location['lat'] ?? null) : null;
        $longitude = is_array($location) ? ($location['lng'] ?? null) : null;

        if (
            ! is_numeric($latitude)
            || ! is_numeric($longitude)
            || (float) $latitude < -90
            || (float) $latitude > 90
            || (float) $longitude < -180
            || (float) $longitude > 180
        ) {
            throw new RuntimeException('Goong Geocoding did not return valid coordinates.');
        }

        return [
            'latitude' => (float) $latitude,
            'longitude' => (float) $longitude,
        ];
    }
}
