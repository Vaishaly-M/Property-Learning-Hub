<?php

namespace App\DTOs;

readonly class MeetingProviderResult
{
    public function __construct(
        public string $provider,
        public ?string $providerMeetingId = null,
        public ?string $providerJoinUrl = null,
        public ?string $providerStartUrl = null,
        public ?string $eventId = null,
        public ?string $teamsMeetingId = null,
        public ?string $teamsJoinUrl = null,
    ) {}
}
