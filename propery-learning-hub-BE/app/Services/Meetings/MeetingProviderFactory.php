<?php

namespace App\Services\Meetings;

use App\Contracts\Meetings\MeetingProviderInterface;
use App\Services\Meetings\Providers\TeamsMeetingProvider;
use App\Services\Meetings\Providers\ZoomMeetingProvider;
use InvalidArgumentException;

class MeetingProviderFactory
{
    public function make(string $provider): MeetingProviderInterface
    {
        return match ($provider) {
            'teams' => app(TeamsMeetingProvider::class),
            'zoom' => app(ZoomMeetingProvider::class),
            default => throw new InvalidArgumentException("Unsupported meeting provider: {$provider}"),
        };
    }
}
