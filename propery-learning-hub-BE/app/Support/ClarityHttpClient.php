<?php

namespace App\Support;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class ClarityHttpClient
{
    public static function client(): PendingRequest
    {
        return Http::withOptions([
            'verify' => self::resolveVerify(),
        ]);
    }

    /**
     * Resolve SSL verification: path to CA bundle, true, or false.
     */
    public static function resolveVerify(): bool|string
    {
        $configured = config('clarity.http_verify_ssl');

        if ($configured !== null && $configured !== '') {
            if (is_string($configured) && $configured !== 'true' && $configured !== 'false' && file_exists($configured)) {
                return $configured;
            }

            return filter_var($configured, FILTER_VALIDATE_BOOLEAN);
        }

        $bundle = config('clarity.ca_bundle');
        if (is_string($bundle) && $bundle !== '' && file_exists($bundle)) {
            return $bundle;
        }

        return true;
    }
}
