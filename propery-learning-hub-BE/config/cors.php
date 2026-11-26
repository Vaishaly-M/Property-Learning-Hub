<?php

use App\Support\FrontendOrigins;

return [
    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => FrontendOrigins::allowed(),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];
