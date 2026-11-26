<?php

namespace App\Repositories;

use App\Models\MentorSession;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class SessionRepository
{
    public function findById(int $id): ?MentorSession
    {
        return MentorSession::with(['mentor', 'student'])->find($id);
    }

    public function paginateForUser(User $user, array $filters = []): LengthAwarePaginator
    {
        $query = MentorSession::with(['mentor', 'student'])
            ->when($user->isInstructor(), fn ($q) => $q->where('mentor_id', $user->id))
            ->when($user->isLearner(), fn ($q) => $q->where('student_id', $user->id))
            ->when(!empty($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(!empty($filters['from']), fn ($q) => $q->where('start_time', '>=', $filters['from']))
            ->when(!empty($filters['to']), fn ($q) => $q->where('start_time', '<=', $filters['to']))
            ->orderBy('start_time');

        return $query->paginate($filters['per_page'] ?? 15);
    }

    public function getUpcomingForMentor(int $mentorId): Collection
    {
        return MentorSession::with('student')
            ->where('mentor_id', $mentorId)
            ->whereIn('status', ['scheduled', 'rescheduled'])
            ->where('start_time', '>=', now())
            ->orderBy('start_time')
            ->get();
    }

    public function hasConflict(int $mentorId, Carbon $start, Carbon $end, ?int $excludeId = null): bool
    {
        $query = MentorSession::query()
            ->where('mentor_id', $mentorId)
            ->whereIn('status', ['scheduled', 'rescheduled'])
            ->where('start_time', '<', $end)
            ->where('end_time', '>', $start);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    public function create(array $data): MentorSession
    {
        return MentorSession::create($data);
    }

    public function update(MentorSession $session, array $data): MentorSession
    {
        $session->update($data);
        return $session->fresh(['mentor', 'student']);
    }
}
