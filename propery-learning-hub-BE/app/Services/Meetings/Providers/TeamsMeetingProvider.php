<?php

namespace App\Services\Meetings\Providers;

use App\Contracts\Meetings\MeetingProviderInterface;
use App\DTOs\BookMeetingDTO;
use App\DTOs\MeetingProviderResult;
use App\Models\PlatformMeeting;
use App\Services\Microsoft\AdminMicrosoftGraphService;
use App\Support\MeetingTimeParser;

class TeamsMeetingProvider implements MeetingProviderInterface
{
    public function __construct(
        private readonly AdminMicrosoftGraphService $graph,
    ) {}

    public function assertReady(): void
    {
        $this->graph->assertReadyForBooking();
    }

    public function createMeeting(BookMeetingDTO $dto, string $subject, string $description): MeetingProviderResult
    {
        $calendarEvent = $this->graph->createCalendarEvent([
            'subject' => $subject,
            'description' => $description,
            'start_time' => MeetingTimeParser::localWallClock($dto->startTime, $dto->timezone),
            'end_time' => MeetingTimeParser::localWallClock($dto->endTime, $dto->timezone),
            'timezone' => $dto->timezone,
            'attendee_list' => $dto->allAttendees(),
            'is_online_meeting' => true,
        ]);

        $joinUrl = $calendarEvent['onlineMeeting']['joinUrl'] ?? null;
        $teamsMeetingId = $calendarEvent['onlineMeeting']['id'] ?? null;

        return new MeetingProviderResult(
            provider: 'teams',
            providerMeetingId: $teamsMeetingId,
            providerJoinUrl: $joinUrl,
            providerStartUrl: null,
            eventId: $calendarEvent['id'] ?? null,
            teamsMeetingId: $teamsMeetingId,
            teamsJoinUrl: $joinUrl,
        );
    }

    public function updateMeeting(PlatformMeeting $meeting, BookMeetingDTO $dto, string $subject, string $description): void
    {
        if (!$meeting->event_id) {
            return;
        }

        $this->graph->updateCalendarEvent($meeting->event_id, [
            'subject' => $subject,
            'description' => $description,
            'start_time' => MeetingTimeParser::localWallClock($dto->startTime, $dto->timezone),
            'end_time' => MeetingTimeParser::localWallClock($dto->endTime, $dto->timezone),
            'timezone' => $dto->timezone,
        ]);
    }

    public function cancelMeeting(PlatformMeeting $meeting): void
    {
        if (!$meeting->event_id) {
            return;
        }

        $this->graph->deleteCalendarEvent($meeting->event_id);
    }
}
