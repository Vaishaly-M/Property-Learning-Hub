<?php

namespace Tests\Unit\Meetings;

use App\Models\PlatformMeeting;
use Carbon\Carbon;
use Tests\TestCase;

class PlatformMeetingFormattingTest extends TestCase
{
    public function test_formats_meeting_date_time_with_timezone(): void
    {
        $meeting = new PlatformMeeting([
            'meeting_type' => 'discovery_call',
            'start_time' => Carbon::create(2026, 6, 20, 14, 0, 0, 'Europe/London'),
            'end_time' => Carbon::create(2026, 6, 20, 14, 30, 0, 'Europe/London'),
            'timezone' => 'Europe/London',
        ]);

        $this->assertStringContainsString('June 20, 2026', $meeting->formattedMeetingDate());
        $this->assertStringContainsString('Europe/London', $meeting->formattedMeetingTimeRange());
        $this->assertStringContainsString('Europe/London', $meeting->formattedMeetingDateTime());
    }

    public function test_resolves_missing_timezone_to_default(): void
    {
        config(['services.microsoft.default_timezone' => 'Europe/London']);

        $meeting = new PlatformMeeting([
            'meeting_type' => 'strategy_call',
            'start_time' => Carbon::parse('2026-06-20 09:00:00', 'UTC'),
            'end_time' => Carbon::parse('2026-06-20 09:30:00', 'UTC'),
            'timezone' => null,
        ]);

        $this->assertSame('Europe/London', $meeting->resolvedTimezone());
    }
}
