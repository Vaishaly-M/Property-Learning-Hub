<?php

namespace Tests\Unit\Meetings;

use App\Support\MeetingExtraAttendee;
use Tests\TestCase;

class MeetingExtraAttendeeTest extends TestCase
{
    public function test_filter_visible_removes_configured_extra_attendee(): void
    {
        config([
            'services.meetings.extra_attendee_email' => 'hidden@example.com',
        ]);

        $participants = [
            ['name' => 'Visible', 'email' => 'visible@example.com'],
            ['name' => 'Hidden', 'email' => 'hidden@example.com'],
        ];

        $visible = MeetingExtraAttendee::filterVisible($participants);

        $this->assertCount(1, $visible);
        $this->assertSame('visible@example.com', $visible[0]['email']);
    }

    public function test_filter_notification_recipients_excludes_configured_extra_attendee(): void
    {
        config([
            'services.meetings.extra_attendee_email' => 'hidden@example.com',
        ]);

        $recipients = MeetingExtraAttendee::filterNotificationRecipients([
            'primary@example.com',
            'hidden@example.com',
            'guest@example.com',
        ]);

        $this->assertSame(['primary@example.com', 'guest@example.com'], $recipients);
    }
}
