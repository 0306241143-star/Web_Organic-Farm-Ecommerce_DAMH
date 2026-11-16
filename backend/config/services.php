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
    ],

    'goong' => [
        'api_key' => env('GOONG_API_KEY'),
        'distance_matrix_url' => env('GOONG_DISTANCE_MATRIX_URL', 'https://rsapi.goong.io/DistanceMatrix'),
    ],

];
