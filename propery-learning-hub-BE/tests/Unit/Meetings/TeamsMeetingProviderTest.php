<?php

namespace Tests\Unit\Meetings;

use App\Services\Meetings\Providers\TeamsMeetingProvider;
use App\Services\Microsoft\AdminMicrosoftGraphService;
use Carbon\Carbon;
use Mockery;
use Tests\TestCase;

class TeamsMeetingProviderTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_create_meeting_creates_teams_online_event(): void
    {
        $graph = Mockery::mock(AdminMicrosoftGraphService::class);

        $start = Carbon::parse('2026-06-25 10:00:00', 'Europe/London');
        $end = $start->copy()->addMinutes(30);

        $graph->shouldReceive('createCalendarEvent')
            ->once()
            ->with(Mockery::on(function (array $payload): bool {
                return ($payload['is_online_meeting'] ?? false) === true;
            }))
            ->andReturn([
                'id' => 'event-teams-1',
                'onlineMeeting' => [
                    'id' => 'teams-meeting-1',
                    'joinUrl' => 'https://teams.microsoft.com/l/meet/abc',
                ],
            ]);

        $provider = new TeamsMeetingProvider($graph);

        $dto = new \App\DTOs\BookMeetingDTO(
            name: 'John Doe',
            email: 'john@example.com',
            meetingType: 'discovery_call',
            startTime: $start,
            endTime: $end,
            timezone: 'Europe/London',
            meetingProvider: 'teams',
        );

        $result = $provider->createMeeting($dto, 'Discovery Call — John Doe', '<p>Notes</p>');

        $this->assertSame('teams', $result->provider);
        $this->assertSame('teams-meeting-1', $result->teamsMeetingId);
        $this->assertSame('https://teams.microsoft.com/l/meet/abc', $result->teamsJoinUrl);
        $this->assertSame('event-teams-1', $result->eventId);
    }
}
