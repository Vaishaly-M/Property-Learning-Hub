<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Microsoft Clarity Data Export API
    |--------------------------------------------------------------------------
    |
    | Despite the GOOGLE_ANALYTICS_* env names (legacy from Invoice module),
    | these credentials are for the Microsoft Clarity project-live-insights API.
    |
    */
    // Official endpoint: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api
    'api_url' => env('GOOGLE_ANALYTICS_URL', 'https://www.clarity.ms/export-data/api/v1/project-live-insights'),
    'api_token' => trim((string) env('GOOGLE_ANALYTICS_ID', '')),
    'timezone' => env('CLARITY_TIMEZONE', 'Europe/London'),
    // Required by Clarity API: only 1, 2, or 3 (last 24 / 48 / 72 hours)
    'num_of_days' => (int) env('CLARITY_NUM_OF_DAYS', 1),
    'failure_alert_email' => env('CLARITY_FAILURE_ALERT_EMAIL', 'dilani@globaltechdevelop.com'),
    'http_verify_ssl' => env('CLARITY_HTTP_VERIFY_SSL', env('MICROSOFT_HTTP_VERIFY_SSL')),
    'ca_bundle' => env('CURL_CA_BUNDLE', storage_path('certs/cacert.pem')),
];
