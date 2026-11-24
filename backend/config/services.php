<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'apipay' => [
        'dashboard_url' => env('APIPAY_DASHBOARD_URL', 'https://my.apipay.vn'),
        'api_base_url' => env('APIPAY_API_BASE_URL', 'https://app.apipay.vn/v1/client'),
        'access_key' => env('APIPAY_ACCESS_KEY'),
        'secret_key' => env('APIPAY_SECRET_KEY'),
        'webhook_secret' => env('APIPAY_WEBHOOK_SECRET'),
        'webhook_url' => env('APIPAY_WEBHOOK_URL'),
        'bank_public_id' => env('APIPAY_BANK_PUBLIC_ID'),
        'bank_name' => env('APIPAY_BANK_NAME', 'ApiPay'),
    ],

    'goong' => [
        'api_key' => env('GOONG_API_KEY'),
        'distance_matrix_url' => env('GOONG_DISTANCE_MATRIX_URL', 'https://rsapi.goong.io/DistanceMatrix'),
        'geocoding_url' => env('GOONG_GEOCODING_URL', 'https://rsapi.goong.io/Geocode'),
    ],

    'shipping' => [
        // Dữ liệu mẫu tính 25.000đ cho 12,5km, tương ứng đơn giá 2.000đ/km.
        'price_per_km' => env('SHIPPING_PRICE_PER_KM', 2000),
        'origin_name' => env('SHIPPING_ORIGIN_NAME', 'Nhà C – Trường Cao đẳng Kỹ thuật Cao Thắng'),
        'origin_address' => env(
            'SHIPPING_ORIGIN_ADDRESS',
            '65 Huỳnh Thúc Kháng, Phường Sài Gòn, Thành phố Hồ Chí Minh'
        ),
        'origin_latitude' => env('SHIPPING_ORIGIN_LATITUDE', 10.771687),
        'origin_longitude' => env('SHIPPING_ORIGIN_LONGITUDE', 106.701978),
    ],

    'checkout' => [
        'pending_payment_timeout_minutes' => env('CHECKOUT_PENDING_PAYMENT_TIMEOUT_MINUTES', 30),
    ],

];
