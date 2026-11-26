<?php

namespace App\Support;

use App\Services\Zoom\ZoomApiService;

class MeetingProviders
{
    public static function zoomEnabled(): bool
    {
        return app(ZoomApiService::class)->isConfigured();
    }

    /** @return list<string> */
    public static function available(): array
    {
        $providers = ['teams'];

        if (self::zoomEnabled()) {
            $providers[] = 'zoom';
        }

        return $providers;
    }

    public static function default(): string
    {
        return 'teams';
    }

    public static function isAllowed(string $provider): bool
    {
        return in_array($provider, self::available(), true);
    }
}
