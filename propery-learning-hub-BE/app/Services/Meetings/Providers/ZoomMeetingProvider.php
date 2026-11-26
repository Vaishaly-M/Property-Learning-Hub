<?php

namespace App\Services\Meetings\Providers;

use App\Contracts\Meetings\MeetingProviderInterface;
use App\DTOs\BookMeetingDTO;
use App\DTOs\MeetingProviderResult;
use App\Models\PlatformMeeting;
use App\Services\Microsoft\AdminMicrosoftGraphService;
use App\Services\Zoom\ZoomApiService;
use App\Support\MeetingTimeParser;

class ZoomMeetingProvider implements MeetingProviderInterface
{
    public function __construct(
        private readonly ZoomApiService $zoom,
        private readonly AdminMicrosoftGraphService $graph,
    ) {}

    public function assertReady(): void
    {
        $this->zoom->assertConfigured();
        $this->graph->assertReadyForBooking();
    }

    public function createMeeting(BookMeetingDTO $dto, string $subject, string $description): MeetingProviderResult
    {
        $duration = max(1, $dto->startTime->diffInMinutes($dto->endTime));

        $zoomMeeting = $this->zoom->createMeeting([
            'topic' => $subject,
            'type' => 2,
            'start_time' => $dto->startTime->copy()->utc()->format('Y-m-d\TH:i:s\Z'),
            'duration' => $duration,
            'timezone' => $dto->timezone,
            'settings' => [
                'join_before_host' => false,
                'waiting_room' => true,
            ],
        ]);

        $joinUrl = $zoomMeeting['join_url'] ?? null;
        $startUrl = $zoomMeeting['start_url'] ?? null;
        $zoomId = isset($zoomMeeting['id']) ? (string) $zoomMeeting['id'] : null;

        $calendarDescription = $this->appendZoomLink($description, $joinUrl);

        try {
            $calendarEvent = $this->graph->createCalendarEvent([
                'subject' => $subject,
                'description' => $calendarDescription,
                'start_time' => MeetingTimeParser::localWallClock($dto->startTime, $dto->timezone),
                'end_time' => MeetingTimeParser::localWallClock($dto->endTime, $dto->timezone),
                'timezone' => $dto->timezone,
                'attendee_list' => $dto->allAttendees(),
                'is_online_meeting' => false,
            ]);
        } catch (\Throwable $e) {
            if ($zoomId) {
                try {
                    $this->zoom->deleteMeeting($zoomId);
                } catch (\Throwable) {
                    //
                }
            }

            throw $e;
        }

        return new MeetingProviderResult(
            provider: 'zoom',
            providerMeetingId: $zoomId,
            providerJoinUrl: $joinUrl,
            providerStartUrl: $startUrl,
            eventId: $calendarEvent['id'] ?? null,
        );
    }

    public function updateMeeting(PlatformMeeting $meeting, BookMeetingDTO $dto, string $subject, string $description): void
    {
        if ($meeting->provider_meeting_id) {
            try {
                $duration = max(1, $dto->startTime->diffInMinutes($dto->endTime));

                $this->zoom->updateMeeting($meeting->provider_meeting_id, [
                    'topic' => $subject,
                    'start_time' => $dto->startTime->copy()->utc()->format('Y-m-d\TH:i:s\Z'),
                    'duration' => $duration,
                    'timezone' => $dto->timezone,
                ]);
            } catch (\Throwable) {
                // Continue with Outlook sync even if Zoom update fails.
            }
        }

        if (!$meeting->event_id) {
            return;
        }

        $joinUrl = $meeting->provider_join_url;
        $calendarDescription = $this->appendZoomLink($description, $joinUrl);

        $this->graph->updateCalendarEvent($meeting->event_id, [
            'subject' => $subject,
            'description' => $calendarDescription,
            'start_time' => MeetingTimeParser::localWallClock($dto->startTime, $dto->timezone),
            'end_time' => MeetingTimeParser::localWallClock($dto->endTime, $dto->timezone),
            'timezone' => $dto->timezone,
        ]);
    }

    public function cancelMeeting(PlatformMeeting $meeting): void
    {
        if ($meeting->provider_meeting_id) {
            try {
                $this->zoom->deleteMeeting($meeting->provider_meeting_id);
            } catch (\Throwable) {
                //
            }
        }

        if ($meeting->event_id) {
            $this->graph->deleteCalendarEvent($meeting->event_id);
        }
    }

    private function appendZoomLink(string $description, ?string $joinUrl): string
    {
        if (!$joinUrl) {
            return $description;
        }

        return $description
            . '<hr>'
            . '<p><strong>Zoom Meeting</strong></p>'
            . '<p><strong>Join URL:</strong> <a href="' . e($joinUrl) . '">' . e($joinUrl) . '</a></p>';
    }
}
