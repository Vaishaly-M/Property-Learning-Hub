<?php

return [
    'version' => '2026-07',
    'company_name' => env('FREE_MEMBERSHIP_AGREEMENT_COMPANY_NAME', 'Freedom Property Academy'),
    'company_number' => env('FREE_MEMBERSHIP_AGREEMENT_COMPANY_NUMBER', '17342925'),
    'company_address' => env(
        'FREE_MEMBERSHIP_AGREEMENT_COMPANY_ADDRESS',
        'Unit 1 Kensworth Gate, 200-204 High Street South, Dunstable, LU63HS'
    ),
    'trading_as' => env('FREE_MEMBERSHIP_AGREEMENT_TRADING_AS', 'Freedom Property Academy'),
    'standard_fee_amount_pence' => (int) env('STRIPE_ACADEMY_AMOUNT', 300000),
    'fee_currency' => env('STRIPE_ACADEMY_CURRENCY', 'gbp'),
    'default_promotion_label' => env(
        'FREE_MEMBERSHIP_PROMOTION_LABEL',
        'Free membership invite registration'
    ),
    'admin_notification_email' => env(
        'FREE_MEMBERSHIP_AGREEMENT_ADMIN_EMAIL',
        env('TRAINING_AGREEMENT_ADMIN_EMAIL', env('MAIL_FROM_ADDRESS', 'admin@freedompropertyacademy.com'))
    ),
    'privacy_policy_url' => env(
        'FREE_MEMBERSHIP_AGREEMENT_PRIVACY_URL',
        env('TRAINING_AGREEMENT_PRIVACY_URL', 'https://freedompropertyacademy.com/privacy')
    ),
    'academy_signatory_name' => env(
        'FREE_MEMBERSHIP_AGREEMENT_SIGNATORY_NAME',
        env('TRAINING_AGREEMENT_SIGNATORY_NAME', 'Andrei Bosancu')
    ),
    'academy_signatory_position' => env(
        'FREE_MEMBERSHIP_AGREEMENT_SIGNATORY_POSITION',
        env('TRAINING_AGREEMENT_SIGNATORY_POSITION', 'CEO')
    ),
    'academy_signature_path' => env(
        'FREE_MEMBERSHIP_AGREEMENT_SIGNATURE_PATH',
        env('TRAINING_AGREEMENT_SIGNATURE_PATH', resource_path('agreements/academy_signature.png'))
    ),
];
