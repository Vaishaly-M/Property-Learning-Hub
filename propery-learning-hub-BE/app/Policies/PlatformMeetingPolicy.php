<?php

namespace App\Policies;

use App\Models\PlatformMeeting;
use App\Models\User;

class PlatformMeetingPolicy
{
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, PlatformMeeting $meeting): bool
    {
        if (!$user) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $meeting->user_id === $user->id
            || $meeting->involvesEmail($user->email);
    }

    public function update(?User $user, PlatformMeeting $meeting): bool
    {
        return $this->view($user, $meeting);
    }

    public function delete(?User $user, PlatformMeeting $meeting): bool
    {
        if (!$user) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        return $meeting->user_id === $user->id
            || strcasecmp($meeting->email, $user->email) === 0;
    }
}
