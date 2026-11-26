<?php

namespace Tests\Unit\Meetings;

use App\DTOs\BookMeetingDTO;
use App\Exceptions\MicrosoftGraphException;
use App\Services\Meetings\Providers\ZoomMeetingProvider;
use App\Services\Microsoft\AdminMicrosoftGraphService;
use App\Services\Zoom\ZoomApiService;
use Carbon\Carbon;
use Mockery;
use Tests\TestCase;

class ZoomMeetingProviderTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_create_meeting_deletes_zoom_meeting_when_outlook_creation_fails(): void
    {
        $zoom = Mockery::mock(ZoomApiService::class);
        $graph = Mockery::mock(AdminMicrosoftGraphService::class);

        $start = Carbon::parse('2026-06-25 10:00:00', 'Pacific/Auckland');
        $end = $start->copy()->addMinutes(30);

        $zoom->shouldReceive('createMeeting')
            ->once()
            ->andReturn([
                'id' => 'zoom-123',
                'join_url' => 'https://zoom.us/j/123',
                'start_url' => 'https://zoom.us/s/123',
            ]);

        $graph->shouldReceive('createCalendarEvent')
            ->once()
            ->andThrow(new MicrosoftGraphException('Outlook failed', 500));

        $zoom->shouldReceive('deleteMeeting')
            ->once()
            ->with('zoom-123');

        $provider = new ZoomMeetingProvider($zoom, $graph);

        $dto = new BookMeetingDTO(
            name: 'Jane Smith',
            email: 'jane@example.com',
            meetingType: 'discovery_call',
            startTime: $start,
            endTime: $end,
            timezone: 'Pacific/Auckland',
            meetingProvider: 'zoom',
        );

        $this->expectException(MicrosoftGraphException::class);

        $provider->createMeeting($dto, 'Discovery Call — Jane Smith', '<p>Notes</p>');
    }

    public function test_create_meeting_returns_zoom_and_outlook_details_on_success(): void
    {
        $zoom = Mockery::mock(ZoomApiService::class);
        $graph = Mockery::mock(AdminMicrosoftGraphService::class);

        $start = Carbon::parse('2026-06-25 10:00:00', 'Pacific/Auckland');
        $end = $start->copy()->addMinutes(30);

        $zoom->shouldReceive('createMeeting')
            ->once()
            ->andReturn([
                'id' => 'zoom-456',
                'join_url' => 'https://zoom.us/j/456',
                'start_url' => 'https://zoom.us/s/456',
            ]);

        $graph->shouldReceive('createCalendarEvent')
            ->once()
            ->with(Mockery::on(function (array $payload): bool {
                return ($payload['is_online_meeting'] ?? true) === false
                    && str_contains($payload['description'] ?? '', 'https://zoom.us/j/456');
            }))
            ->andReturn(['id' => 'outlook-event-1']);

        $provider = new ZoomMeetingProvider($zoom, $graph);

        $dto = new BookMeetingDTO(
            name: 'Jane Smith',
            email: 'jane@example.com',
            meetingType: 'discovery_call',
            startTime: $start,
            endTime: $end,
            timezone: 'Pacific/Auckland',
            meetingProvider: 'zoom',
        );

        $result = $provider->createMeeting($dto, 'Discovery Call — Jane Smith', '<p>Notes</p>');

        $this->assertSame('zoom', $result->provider);
        $this->assertSame('zoom-456', $result->providerMeetingId);
        $this->assertSame('https://zoom.us/j/456', $result->providerJoinUrl);
        $this->assertSame('outlook-event-1', $result->eventId);
    }
}
