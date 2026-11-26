<?php

return [
    'version' => '2026-07',
    'company_name' => env('TRAINING_AGREEMENT_COMPANY_NAME', 'Freedom Property Academy LTD'),
    'company_number' => env('TRAINING_AGREEMENT_COMPANY_NUMBER', '17342925'),
    'company_address' => env(
        'TRAINING_AGREEMENT_COMPANY_ADDRESS',
        'Unit 1 Kensworth Gate, 200-204 High Street South, Dunstable, LU63HS'
    ),
    'trading_as' => env('TRAINING_AGREEMENT_TRADING_AS', 'Freedom Property Academy'),
    'fee_amount_pence' => (int) env('STRIPE_ACADEMY_AMOUNT', 300000),
    'fee_currency' => env('STRIPE_ACADEMY_CURRENCY', 'gbp'),
    'admin_notification_email' => env(
        'TRAINING_AGREEMENT_ADMIN_EMAIL',
        env('MAIL_FROM_ADDRESS', 'admin@freedompropertyacademy.com')
    ),
    'privacy_policy_url' => env('TRAINING_AGREEMENT_PRIVACY_URL', 'https://freedompropertyacademy.com/privacy'),
    'academy_signatory_name' => env('TRAINING_AGREEMENT_SIGNATORY_NAME', 'Andrei Bosancu'),
    'academy_signatory_position' => env('TRAINING_AGREEMENT_SIGNATORY_POSITION', 'CEO'),
    'academy_signature_path' => env(
        'TRAINING_AGREEMENT_SIGNATURE_PATH',
        resource_path('agreements/academy_signature.png')
    ),
];
