<?php

namespace App\Contracts\Meetings;

use App\DTOs\BookMeetingDTO;
use App\DTOs\MeetingProviderResult;
use App\Models\PlatformMeeting;

interface MeetingProviderInterface
{
    public function assertReady(): void;

    public function createMeeting(BookMeetingDTO $dto, string $subject, string $description): MeetingProviderResult;

    public function updateMeeting(PlatformMeeting $meeting, BookMeetingDTO $dto, string $subject, string $description): void;

    public function cancelMeeting(PlatformMeeting $meeting): void;
}
