<?php

namespace App\Services\Crm;

use App\Models\Contact;
use App\Models\PlatformMeeting;
use App\Support\MeetingExtraAttendee;

class PlatformMeetingCrmSyncService
{
    public function __construct(
        private readonly CrmContactSyncService $contacts,
        private readonly ClassificationWorkflowService $workflows,
    ) {}

    public function syncBooking(PlatformMeeting $meeting): void
    {
        if (! $this->shouldSync($meeting)) {
            return;
        }

        $primaryContact = $this->syncAttendee(
            meeting: $meeting,
            name: (string) $meeting->name,
            email: (string) $meeting->email,
            phone: $meeting->phone,
            userId: $meeting->user_id,
            isPrimary: true,
        );

        foreach ($meeting->visibleParticipants() as $participant) {
            $this->syncAttendee(
                meeting: $meeting,
                name: (string) ($participant['name'] ?? $participant['email']),
                email: (string) $participant['email'],
                phone: null,
                userId: null,
                isPrimary: false,
                skipIfContactId: $primaryContact->id,
            );
        }
    }

    public function syncReschedule(PlatformMeeting $meeting): void
    {
        if (! $this->shouldSync($meeting)) {
            return;
        }

        foreach ($this->bookingAttendees($meeting) as $attendee) {
            $contact = $this->resolveContact($meeting, $attendee, false);
            if (! $contact || $this->hasActivity($contact, $meeting->id, 'rescheduled')) {
                continue;
            }

            ContactActivityService::log(
                $contact,
                'coaching_session',
                $this->rescheduleTitle($meeting),
                $meeting->formattedMeetingDateTime(),
                $this->activityMetadata($meeting, 'rescheduled'),
            );
        }
    }

    public function syncCancellation(PlatformMeeting $meeting): void
    {
        if (! $this->shouldSync($meeting)) {
            return;
        }

        foreach ($this->bookingAttendees($meeting) as $attendee) {
            $contact = $this->resolveContact($meeting, $attendee, false);
            if (! $contact || $this->hasActivity($contact, $meeting->id, 'cancelled')) {
                continue;
            }

            ContactActivityService::log(
                $contact,
                'coaching_session',
                $this->cancellationTitle($meeting),
                $meeting->formattedMeetingDateTime(),
                $this->activityMetadata($meeting, 'cancelled'),
            );
        }
    }

    private function shouldSync(PlatformMeeting $meeting): bool
    {
        return in_array($meeting->meeting_type, ['discovery_call', 'strategy_call'], true);
    }

    /**
     * @return list<array{name: string, email: string, phone?: string|null, user_id?: int|null, is_primary?: bool}>
     */
    private function bookingAttendees(PlatformMeeting $meeting): array
    {
        $attendees = [[
            'name' => (string) $meeting->name,
            'email' => (string) $meeting->email,
            'phone' => $meeting->phone,
            'user_id' => $meeting->user_id,
            'is_primary' => true,
        ]];

        foreach ($meeting->visibleParticipants() as $participant) {
            $attendees[] = [
                'name' => (string) ($participant['name'] ?? $participant['email']),
                'email' => (string) $participant['email'],
                'phone' => null,
                'user_id' => null,
                'is_primary' => false,
            ];
        }

        return $attendees;
    }

    private function syncAttendee(
        PlatformMeeting $meeting,
        string $name,
        string $email,
        ?string $phone,
        ?int $userId,
        bool $isPrimary,
        ?int $skipIfContactId = null,
    ): ?Contact {
        if (MeetingExtraAttendee::isHidden($email)) {
            return null;
        }

        $contact = $this->contacts->findOrCreateFromBooking(
            $name,
            $email,
            $phone,
            $userId,
            'discovery call booking',
        );

        if ($skipIfContactId !== null && $contact->id === $skipIfContactId) {
            return $contact;
        }

        if ($this->hasActivity($contact, $meeting->id, 'booked')) {
            return $contact;
        }

        ContactActivityService::log(
            $contact,
            'coaching_session',
            $this->bookingTitle($meeting),
            $meeting->formattedMeetingDateTime(),
            $this->activityMetadata($meeting, 'booked'),
        );

        if ($isPrimary) {
            $this->applyLeadClassifications($contact);
            $this->workflows->applyRules($contact, 'meeting_registered', [
                'meeting_type' => $meeting->meeting_type === 'discovery_call' ? 'discovery' : $meeting->meeting_type,
            ]);
        }

        return $contact;
    }

    /**
     * @param  array{name: string, email: string, phone?: string|null, user_id?: int|null, is_primary?: bool}  $attendee
     */
    private function resolveContact(PlatformMeeting $meeting, array $attendee, bool $isPrimary): ?Contact
    {
        if (MeetingExtraAttendee::isHidden($attendee['email'])) {
            return null;
        }

        return $this->contacts->findOrCreateFromBooking(
            $attendee['name'],
            $attendee['email'],
            $attendee['phone'] ?? null,
            $attendee['user_id'] ?? null,
            'discovery call booking',
        );
    }

    private function applyLeadClassifications(Contact $contact): void
    {
        $existing = $contact->classifications()->pluck('classification')->toArray();

        foreach (['lead', 'enquiry'] as $classification) {
            if (! in_array($classification, $existing, true)) {
                $existing[] = $classification;
            }
        }

        $contact->syncClassifications($existing);
    }

    private function bookingTitle(PlatformMeeting $meeting): string
    {
        return match ($meeting->meeting_type) {
            'discovery_call' => 'Discovery call booked',
            'strategy_call' => 'Strategy call booked',
            default => ucwords(str_replace('_', ' ', (string) $meeting->meeting_type)).' booked',
        };
    }

    private function rescheduleTitle(PlatformMeeting $meeting): string
    {
        return match ($meeting->meeting_type) {
            'discovery_call' => 'Discovery call rescheduled',
            'strategy_call' => 'Strategy call rescheduled',
            default => ucwords(str_replace('_', ' ', (string) $meeting->meeting_type)).' rescheduled',
        };
    }

    private function cancellationTitle(PlatformMeeting $meeting): string
    {
        return match ($meeting->meeting_type) {
            'discovery_call' => 'Discovery call cancelled',
            'strategy_call' => 'Strategy call cancelled',
            default => ucwords(str_replace('_', ' ', (string) $meeting->meeting_type)).' cancelled',
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function activityMetadata(PlatformMeeting $meeting, string $action): array
    {
        return [
            'platform_meeting_id' => $meeting->id,
            'platform_meeting_uuid' => $meeting->uuid,
            'meeting_type' => $meeting->meeting_type,
            'booking_type' => $meeting->booking_type,
            'action' => $action,
            'start_time' => $meeting->start_time?->copy()->utc()->toIso8601String(),
            'end_time' => $meeting->end_time?->copy()->utc()->toIso8601String(),
            'timezone' => $meeting->timezone,
        ];
    }

    private function hasActivity(Contact $contact, int $meetingId, string $action): bool
    {
        return $contact->activities()
            ->where('activity_type', 'coaching_session')
            ->where('metadata->platform_meeting_id', $meetingId)
            ->where('metadata->action', $action)
            ->exists();
    }
}
