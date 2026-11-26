<?php

namespace App\Policies;

use App\Models\MentorSession;
use App\Models\User;

class MentorSessionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isInstructor() || $user->isLearner() || $user->isAdmin();
    }

    public function view(User $user, MentorSession $session): bool
    {
        return $user->isAdmin()
            || $session->mentor_id === $user->id
            || $session->student_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->isInstructor() || $user->isLearner() || $user->isAdmin();
    }

    public function update(User $user, MentorSession $session): bool
    {
        return $user->isAdmin() || $session->mentor_id === $user->id;
    }

    public function delete(User $user, MentorSession $session): bool
    {
        return $user->isAdmin() || $session->mentor_id === $user->id;
    }
}
