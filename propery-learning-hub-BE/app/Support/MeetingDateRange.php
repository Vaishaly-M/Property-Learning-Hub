<?php

namespace App\Support;

use Carbon\Carbon;

class MeetingDateRange
{
    public static function parseBoundary(?string $value, string $timezone, bool $endOfDay = false): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        $timezone = TimezoneHelper::resolve($timezone);

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1) {
            $time = $endOfDay ? '23:59:59' : '00:00:00';

            return Carbon::parse($value . ' ' . $time, $timezone)->utc();
        }

        return Carbon::parse($value, $timezone)->utc();
    }
}
