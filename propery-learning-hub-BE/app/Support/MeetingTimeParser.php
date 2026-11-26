<?php

namespace App\Support;

use Carbon\Carbon;

class MeetingTimeParser
{
    /**
     * Parse a client-supplied datetime into UTC for persistence.
     *
     * ISO strings with Z or a numeric offset are treated as absolute instants.
     * Naive strings are interpreted in the supplied IANA timezone.
     */
    public static function parseInstant(string $value, string $timezone): Carbon
    {
        $timezone = TimezoneHelper::resolve($timezone);
        $value = trim($value);

        if ($value === '') {
            throw new \InvalidArgumentException('Meeting datetime is required.');
        }

        if (preg_match('/(Z|[+-]\d{2}:\d{2})$/i', $value) === 1) {
            return Carbon::parse($value)->utc();
        }

        return Carbon::parse($value, $timezone)->utc();
    }

    /**
     * UTC instant as a Carbon in the meeting's display timezone (for provider APIs).
     */
    public static function inTimezone(Carbon $utcInstant, string $timezone): Carbon
    {
        return $utcInstant->copy()->utc()->timezone(TimezoneHelper::resolve($timezone));
    }

    /** Local wall-clock string for Microsoft Graph calendar events. */
    public static function localWallClock(Carbon $utcInstant, string $timezone): string
    {
        return static::inTimezone($utcInstant, $timezone)->format('Y-m-d\TH:i:s');
    }
}
