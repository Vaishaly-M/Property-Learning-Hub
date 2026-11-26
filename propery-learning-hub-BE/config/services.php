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

    'microsoft' => [
        'client_id' => env('MICROSOFT_CLIENT_ID'),
        'client_secret' => env('MICROSOFT_CLIENT_SECRET'),
        'tenant_id' => env('MICROSOFT_TENANT_ID', 'common'),
        'redirect_uri' => env('MICROSOFT_REDIRECT_URI'),
        // app_only = use .env client credentials only (no frontend OAuth connect)
        // oauth = prefer admin sign-in; auto = oauth if connected else app_only
        'auth_mode' => env('MICROSOFT_AUTH_MODE', 'app_only'),
        'admin_email' => env('ADMIN_EMAIL'),
        'admin_name' => env('ADMIN_NAME', 'Platform Admin'),
        'default_timezone' => env('DEFAULT_TIMEZONE', 'Europe/London'),
        'working_hours_start' => env('WORKING_HOURS_START', '09:00'),
        'working_hours_end' => env('WORKING_HOURS_END', '17:00'),
        'scopes' => [
            'User.Read',
            'Calendars.Read',
            'Calendars.ReadWrite',
            'OnlineMeetings.ReadWrite',
            'offline_access',
        ],
        'graph_base_url' => env('MICROSOFT_GRAPH_BASE_URL', 'https://graph.microsoft.com/v1.0'),
        'slot_duration_minutes' => (int) env('MENTOR_SLOT_DURATION_MINUTES', 30),
        'delegated_scopes' => [
            'openid',
            'profile',
            'offline_access',
            'User.Read',
            'Calendars.Read',
            'Calendars.ReadWrite',
            'OnlineMeetings.ReadWrite',
        ],
        'http_verify_ssl' => env('MICROSOFT_HTTP_VERIFY_SSL'),
        'ca_bundle' => env('CURL_CA_BUNDLE', storage_path('certs/cacert.pem')),
        'meeting_types' => [
            'discovery_call',
            'mentorship_session',
            'property_consultation',
            'general_inquiry',
        ],
    ],

    'stripe' => [
        'key' => env('STRIPE_KEY'),
        'secret' => env('STRIPE_SECRET'),
        'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
        'academy_amount' => (int) env('STRIPE_ACADEMY_AMOUNT', 300000),
        'academy_currency' => env('STRIPE_ACADEMY_CURRENCY', 'gbp'),
        'academy_product_name' => env('STRIPE_ACADEMY_PRODUCT_NAME', 'Freedom Property Journey'),
    ],

    'zoom' => [
        'account_id' => env('ZOOM_ACCOUNT_ID'),
        'client_id' => env('ZOOM_CLIENT_ID'),
        'client_secret' => env('ZOOM_CLIENT_SECRET'),
        'base_url' => env('ZOOM_BASE_URL', 'https://api.zoom.us/v2'),
        'auth_url' => env('ZOOM_AUTH_URL', 'https://zoom.us/oauth/token'),
        'user_id' => env('ZOOM_USER_ID', 'me'),
        'fallback_to_meeting' => env('ZOOM_FALLBACK_TO_MEETING', true),
    ],

    'meetings' => [
        'extra_attendee_email' => env('MEETING_EXTRA_ATTENDEE_EMAIL'),
        'extra_attendee_name' => env('MEETING_EXTRA_ATTENDEE_NAME', 'Meeting Member'),
    ],

    'infinitwizard' => [
        // Laravel BE base URL (no trailing slash), e.g. https://api.infinitwizard.io
        'api_url' => env('INFINITWIZARD_API_URL'),
        // Must match InfinitWizard APP_API_KEY
        'api_key' => env('INFINITWIZARD_APP_API_KEY'),
    ],

];
