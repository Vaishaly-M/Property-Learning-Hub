<?php

namespace Tests\Unit\Meetings;

use App\Support\MeetingTimeParser;
use Carbon\Carbon;
use Tests\TestCase;

class MeetingTimeParserTest extends TestCase
{
    public function test_parses_offset_iso_to_utc_instant(): void
    {
        $utc = MeetingTimeParser::parseInstant('2026-06-20T09:30:00+01:00', 'Europe/London');

        $this->assertSame('08:30', $utc->format('H:i'));
    }

    public function test_parses_naive_datetime_in_meeting_timezone(): void
    {
        $utc = MeetingTimeParser::parseInstant('2026-06-20T09:30:00', 'Europe/London');

        $this->assertSame('08:30', $utc->format('H:i'));
    }

    public function test_does_not_shift_zulu_timestamp_with_meeting_timezone(): void
    {
        $utc = MeetingTimeParser::parseInstant('2026-06-20T09:30:00Z', 'Europe/London');

        $this->assertSame('09:30', $utc->format('H:i'));
    }

    public function test_in_timezone_returns_local_wall_clock(): void
    {
        $utc = Carbon::parse('2026-06-20T08:30:00', 'UTC');
        $local = MeetingTimeParser::inTimezone($utc, 'Europe/London');

        $this->assertSame('09:30', $local->format('H:i'));
        $this->assertSame('Europe/London', $local->timezone->getName());
    }
}
