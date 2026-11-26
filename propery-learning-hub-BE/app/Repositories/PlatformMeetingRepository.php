<?php

namespace App\Repositories;

use App\Models\PlatformMeeting;
use App\Models\User;
use App\Support\MeetingDateRange;
use App\Support\PlatformMeetingParticipantScope;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class PlatformMeetingRepository
{
    public function findById(int $id): ?PlatformMeeting
    {
        return PlatformMeeting::query()->find($id);
    }

    public function paginateAll(array $filters = []): LengthAwarePaginator
    {
        $query = PlatformMeeting::query()
            ->when(!empty($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(!empty($filters['from']), function ($q) use ($filters) {
                $from = MeetingDateRange::parseBoundary($filters['from'], $filters['timezone'] ?? 'UTC');
                if ($from) {
                    $q->where('start_time', '>=', $from);
                }
            })
            ->when(!empty($filters['to']), function ($q) use ($filters) {
                $to = MeetingDateRange::parseBoundary($filters['to'], $filters['timezone'] ?? 'UTC', true);
                if ($to) {
                    $q->where('start_time', '<=', $to);
                }
            })
            ->orderByDesc('start_time');

        return $query->paginate($filters['per_page'] ?? 50);
    }

    public function paginateForUser(?User $user, ?string $email, array $filters = []): LengthAwarePaginator
    {
        $normalizedEmail = $email ? strtolower(trim($email)) : null;

        $query = PlatformMeeting::query()
            ->when($user, function ($q) use ($user, $normalizedEmail) {
                $q->where(function ($inner) use ($user, $normalizedEmail) {
                    $inner->where('user_id', $user->id);

                    if ($normalizedEmail) {
                        $inner->orWhereRaw('LOWER(email) = ?', [$normalizedEmail]);
                        PlatformMeetingParticipantScope::applyParticipantEmailConstraint($inner, $normalizedEmail);
                    }
                });
            })
            ->when(!$user && $normalizedEmail, function ($q) use ($normalizedEmail) {
                $q->where(function ($inner) use ($normalizedEmail) {
                    $inner->whereRaw('LOWER(email) = ?', [$normalizedEmail]);
                    PlatformMeetingParticipantScope::applyParticipantEmailConstraint($inner, $normalizedEmail);
                });
            })
            ->when(!empty($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(!empty($filters['from']), function ($q) use ($filters) {
                $from = MeetingDateRange::parseBoundary($filters['from'], $filters['timezone'] ?? 'UTC');
                if ($from) {
                    $q->where('start_time', '>=', $from);
                }
            })
            ->when(!empty($filters['to']), function ($q) use ($filters) {
                $to = MeetingDateRange::parseBoundary($filters['to'], $filters['timezone'] ?? 'UTC', true);
                if ($to) {
                    $q->where('start_time', '<=', $to);
                }
            })
            ->orderByDesc('start_time');

        return $query->paginate($filters['per_page'] ?? 15);
    }

    public function getActiveBetween(Carbon $start, Carbon $end): Collection
    {
        $startUtc = $start->copy()->utc();
        $endUtc = $end->copy()->utc();

        return PlatformMeeting::query()
            ->whereIn('status', ['scheduled', 'rescheduled'])
            ->where('start_time', '<', $endUtc)
            ->where('end_time', '>', $startUtc)
            ->get();
    }

    public function getCancelledBetween(Carbon $start, Carbon $end): Collection
    {
        $startUtc = $start->copy()->utc();
        $endUtc = $end->copy()->utc();

        return PlatformMeeting::query()
            ->where('status', 'cancelled')
            ->where('start_time', '<', $endUtc)
            ->where('end_time', '>', $startUtc)
            ->get();
    }

    /**
     * Outlook event IDs for platform meetings in range.
     * These are excluded from Outlook busy times so cancelled/rescheduled
     * meetings do not leave stale blocks on the calendar.
     *
     * @return list<string>
     */
    public function getManagedOutlookEventIds(Carbon $start, Carbon $end): array
    {
        $startUtc = $start->copy()->utc();
        $endUtc = $end->copy()->utc();

        return PlatformMeeting::query()
            ->where('start_time', '<', $endUtc)
            ->where('end_time', '>', $startUtc)
            ->whereNotNull('event_id')
            ->pluck('event_id')
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    public function hasConflict(Carbon $start, Carbon $end, ?int $excludeId = null): bool
    {
        $startUtc = $start->copy()->utc();
        $endUtc = $end->copy()->utc();

        $query = PlatformMeeting::query()
            ->whereIn('status', ['scheduled', 'rescheduled'])
            ->where('start_time', '<', $endUtc)
            ->where('end_time', '>', $startUtc);

        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }

        return $query->exists();
    }

    public function create(array $data): PlatformMeeting
    {
        return PlatformMeeting::create($data);
    }

    public function update(PlatformMeeting $meeting, array $data): PlatformMeeting
    {
        $meeting->update($data);

        return $meeting->fresh();
    }
}
