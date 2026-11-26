<?php

namespace Tests\Unit\Meetings;

use Carbon\Carbon;
use Tests\TestCase;

class TimezoneParseTest extends TestCase
{
    public function test_availability_slot_iso_matches_booking_parse(): void
    {
        $timezone = 'Europe/London';
        $cursor = Carbon::parse('2026-06-20 09:30:00', $timezone);
        $iso = $cursor->toIso8601String();

        $booked = Carbon::parse($iso, $timezone);

        $this->assertSame(
            '09:30',
            $booked->copy()->timezone($timezone)->format('H:i'),
            "ISO {$iso} should book as 09:30 London"
        );
        $this->assertSame(
            '08:30',
            $booked->copy()->utc()->format('H:i'),
            'Stored UTC should be 08:30 during BST'
        );
    }

    public function test_naive_datetime_string_parsed_with_timezone(): void
    {
        $timezone = 'Europe/London';
        $booked = Carbon::parse('2026-06-20T09:30:00', $timezone);

        $this->assertSame('09:30', $booked->copy()->timezone($timezone)->format('H:i'));
        $this->assertSame('08:30', $booked->copy()->utc()->format('H:i'));
    }

    public function test_naive_datetime_without_timezone_uses_utc(): void
    {
        $booked = Carbon::parse('2026-06-20T09:30:00');

        $this->assertSame('09:30', $booked->copy()->utc()->format('H:i'));
        $this->assertSame('10:30', $booked->copy()->timezone('Europe/London')->format('H:i'));
    }
}
