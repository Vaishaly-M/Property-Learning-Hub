<?php

namespace App\Support;

use Carbon\Carbon;

class HumanTime
{
    /**
     * Human-readable relative time (e.g. "2 hours ago").
     */
    public static function ago(mixed $timestamp): string
    {
        if (!$timestamp) {
            return 'just now';
        }

        $ts = $timestamp instanceof Carbon
            ? $timestamp->copy()
            : Carbon::parse($timestamp, config('app.timezone'));

        if ($ts->isFuture()) {
            return 'just now';
        }

        $minutes = (int) round(abs(now()->diffInMinutes($ts, false)));

        if ($minutes < 1) {
            return 'just now';
        }
        if ($minutes < 60) {
            return $minutes . ($minutes === 1 ? ' minute ago' : ' minutes ago');
        }
        if ($minutes < 1440) {
            $hours = max(1, (int) round($minutes / 60));

            return $hours . ($hours === 1 ? ' hour ago' : ' hours ago');
        }
        if ($minutes < 2880) {
            return '1 day ago';
        }

        $days = max(2, (int) round($minutes / 1440));

        return $days . ' days ago';
    }
}
