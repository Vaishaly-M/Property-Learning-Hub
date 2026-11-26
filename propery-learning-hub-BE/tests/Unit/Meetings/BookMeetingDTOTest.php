<?php

namespace Tests\Unit\Meetings;

use App\DTOs\BookMeetingDTO;
use Carbon\Carbon;
use Tests\TestCase;

class BookMeetingDTOTest extends TestCase
{
    public function test_all_attendees_includes_configured_extra_member(): void
    {
        config([
            'services.meetings.extra_attendee_email' => 'extra@example.com',
            'services.meetings.extra_attendee_name' => 'Extra Member',
        ]);

        $dto = new BookMeetingDTO(
            name: 'Primary User',
            email: 'primary@example.com',
            meetingType: 'discovery_call',
            startTime: Carbon::parse('2026-06-20 10:00:00'),
            endTime: Carbon::parse('2026-06-20 10:30:00'),
            timezone: 'Europe/London',
        );

        $attendees = $dto->allAttendees();

        $this->assertCount(2, $attendees);
        $this->assertSame('primary@example.com', $attendees[0]['email']);
        $this->assertSame('extra@example.com', $attendees[1]['email']);
        $this->assertSame('Extra Member', $attendees[1]['name']);
    }

    public function test_all_attendees_skips_duplicate_extra_member(): void
    {
        config([
            'services.meetings.extra_attendee_email' => 'extra@example.com',
            'services.meetings.extra_attendee_name' => 'Extra Member',
        ]);

        $dto = new BookMeetingDTO(
            name: 'Primary User',
            email: 'primary@example.com',
            meetingType: 'discovery_call',
            startTime: Carbon::parse('2026-06-20 10:00:00'),
            endTime: Carbon::parse('2026-06-20 10:30:00'),
            timezone: 'Europe/London',
            participants: [
                ['name' => 'Already Added', 'email' => 'extra@example.com'],
            ],
        );

        $attendees = $dto->allAttendees();

        $this->assertCount(2, $attendees);
        $this->assertSame('Already Added', $attendees[1]['name']);
    }
}
