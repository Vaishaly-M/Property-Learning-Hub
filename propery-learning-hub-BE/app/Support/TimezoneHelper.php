<?php

namespace App\Support;

class TimezoneHelper
{
    private const ALIASES = [
        'Australia/Auckland' => 'Pacific/Auckland',
        'UK' => 'Europe/London',
        'GB' => 'Europe/London',
        'GMT Standard Time' => 'Europe/London',
        'Greenwich Standard Time' => 'Europe/London',
        'W. Europe Standard Time' => 'Europe/Berlin',
        'Central European Standard Time' => 'Europe/Berlin',
    ];

    public static function resolve(?string $timezone): string
    {
        $timezone = $timezone ?: config('services.microsoft.default_timezone', 'Europe/London');

        return self::ALIASES[$timezone] ?? $timezone;
    }

    /**
     * Microsoft Graph often returns Windows timezone names instead of IANA identifiers.
     */
    public static function resolveGraph(?string $graphTimezone, string $fallback): string
    {
        if (!$graphTimezone) {
            return self::resolve($fallback);
        }

        $graphTimezone = trim($graphTimezone);

        $windowsToIana = [
            'GMT Standard Time' => 'Europe/London',
            'Greenwich Standard Time' => 'Europe/London',
            'W. Europe Standard Time' => 'Europe/Berlin',
            'Central European Standard Time' => 'Europe/Berlin',
            'UTC' => 'UTC',
        ];

        if (isset($windowsToIana[$graphTimezone])) {
            return $windowsToIana[$graphTimezone];
        }

        try {
            new \DateTimeZone($graphTimezone);

            return $graphTimezone;
        } catch (\Exception) {
            return self::resolve($fallback);
        }
    }
}
