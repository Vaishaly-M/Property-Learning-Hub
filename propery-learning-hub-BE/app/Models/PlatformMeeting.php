<?php

namespace App\Models;

use App\Support\MeetingExtraAttendee;
use App\Support\TimezoneHelper;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PlatformMeeting extends Model
{
    protected $table = 'platform_meetings';

    protected $fillable = [
        'uuid',
        'user_id',
        'booking_type',
        'name',
        'email',
        'phone',
        'participants',
        'meeting_type',
        'meeting_provider',
        'event_id',
        'teams_meeting_id',
        'teams_join_url',
        'provider_meeting_id',
        'provider_join_url',
        'provider_start_url',
        'organizer_email',
        'manage_token',
        'start_time',
        'end_time',
        'status',
        'notes',
        'timezone',
    ];

    protected function casts(): array
    {
        return [
            'start_time' => 'datetime',
            'end_time' => 'datetime',
            'participants' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (PlatformMeeting $meeting) {
            if (!$meeting->uuid) {
                $meeting->uuid = (string) Str::uuid();
            }
            if (!$meeting->manage_token) {
                $meeting->manage_token = Str::random(48);
            }
            if (!$meeting->organizer_email) {
                $meeting->organizer_email = config('services.microsoft.admin_email');
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return in_array($this->status, ['scheduled', 'rescheduled', 'booked'], true);
    }

    public function getPublicStatusAttribute(): string
    {
        return match ($this->status) {
            'scheduled', 'rescheduled' => 'booked',
            default => $this->status,
        };
    }

    public function resolvedProvider(): string
    {
        return $this->meeting_provider ?: 'teams';
    }

    public function joinUrl(): ?string
    {
        return $this->provider_join_url ?: $this->teams_join_url;
    }

    public function providerLabel(): string
    {
        return match ($this->resolvedProvider()) {
            'zoom' => 'Zoom',
            default => 'Microsoft Teams',
        };
    }

    public function discussionLabel(): string
    {
        return $this->meeting_type === 'discovery_call'
            ? 'What would you like to discuss?'
            : 'Notes';
    }

    /**
     * @return list<string>
     */
    public function discussionPrompts(): array
    {
        if ($this->meeting_type !== 'discovery_call') {
            return [];
        }

        return [
            'Where are you right now in your property journey?',
            'What do you feel is the biggest bottleneck holding you back right now?',
        ];
    }

    /**
     * @return list<array{name: string, email: string}>
     */
    public function visibleParticipants(): array
    {
        return \App\Support\MeetingExtraAttendee::filterVisible($this->participants ?? []);
    }

    public function involvesEmail(string $email): bool
    {
        $needle = strtolower(trim($email));

        if ($needle === '') {
            return false;
        }

        if (strtolower(trim((string) $this->email)) === $needle) {
            return true;
        }

        foreach ($this->participants ?? [] as $participant) {
            if (strtolower(trim((string) ($participant['email'] ?? ''))) === $needle) {
                return true;
            }
        }

        return false;
    }

    /**
     * Primary booker plus additional participants for display.
     *
     * @return list<array{name: string, email: string}>
     */
    public function allAttendeesForDisplay(): array
    {
        $primaryEmail = strtolower(trim((string) $this->email));
        $all = [];

        if ($primaryEmail !== '') {
            $all[] = [
                'name' => trim((string) $this->name) ?: $this->email,
                'email' => $this->email,
            ];
        }

        $seen = $primaryEmail !== '' ? [$primaryEmail] : [];

        foreach ($this->visibleParticipants() as $participant) {
            $email = strtolower(trim((string) ($participant['email'] ?? '')));

            if ($email === '' || in_array($email, $seen, true)) {
                continue;
            }

            $seen[] = $email;
            $all[] = [
                'name' => trim((string) ($participant['name'] ?? '')) ?: $participant['email'],
                'email' => $participant['email'],
            ];
        }

        return $all;
    }

    /**
     * All notification recipients: primary booker, every stored participant, and the configured extra attendee.
     *
     * @return list<array{name: string, email: string}>
     */
    public function allAttendeesForNotifications(): array
    {
        $primaryEmail = strtolower(trim((string) $this->email));
        $all = [];

        if ($primaryEmail !== '') {
            $all[] = [
                'name' => trim((string) $this->name) ?: $this->email,
                'email' => $this->email,
            ];
        }

        $seen = $primaryEmail !== '' ? [$primaryEmail] : [];

        foreach ($this->participants ?? [] as $participant) {
            $email = strtolower(trim((string) ($participant['email'] ?? '')));

            if ($email === '' || in_array($email, $seen, true)) {
                continue;
            }

            $seen[] = $email;
            $all[] = [
                'name' => trim((string) ($participant['name'] ?? '')) ?: $participant['email'],
                'email' => $participant['email'],
            ];
        }

        $extraEmail = MeetingExtraAttendee::configuredEmail();
        if ($extraEmail !== null && !in_array($extraEmail, $seen, true)) {
            $all[] = [
                'name' => $extraEmail,
                'email' => $extraEmail,
            ];
        }

        return $all;
    }

    public function resolvedTimezone(): string
    {
        return TimezoneHelper::resolve($this->timezone);
    }

    public function formattedTimezoneLabel(): string
    {
        $timezone = $this->resolvedTimezone();
        $abbrev = $this->start_time?->timezone($timezone)->format('T') ?? '';

        return $abbrev !== '' ? "{$timezone} ({$abbrev})" : $timezone;
    }

    public function formattedMeetingDate(): string
    {
        return $this->start_time
            ->timezone($this->resolvedTimezone())
            ->format('l, F j, Y');
    }

    public function formattedMeetingTimeRange(): string
    {
        $timezone = $this->resolvedTimezone();
        $start = $this->start_time->timezone($timezone)->format('g:i A');
        $end = $this->end_time->timezone($timezone)->format('g:i A');

        return "{$start} – {$end} ({$this->formattedTimezoneLabel()})";
    }

    public function formattedTimeRangeFor(?Carbon $start, ?Carbon $end): ?string
    {
        if (!$start || !$end) {
            return null;
        }

        $timezone = $this->resolvedTimezone();
        $localStart = $start->copy()->timezone($timezone);
        $localEnd = $end->copy()->timezone($timezone);

        return $localStart->format('l, F j, Y') . ', '
            . $localStart->format('g:i A') . ' – ' . $localEnd->format('g:i A')
            . ' (' . $this->formattedTimezoneLabel() . ')';
    }

    public function formattedMeetingDateTime(): string
    {
        return $this->formattedMeetingDate() . ' at ' . $this->formattedMeetingTimeRange();
    }
}
