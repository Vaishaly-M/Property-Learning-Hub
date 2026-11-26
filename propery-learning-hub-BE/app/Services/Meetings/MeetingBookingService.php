<?php

namespace App\Services\Meetings;

use App\DTOs\BookMeetingDTO;
use App\Exceptions\BookingConflictException;
use App\Mail\MeetingBookedAdminNotification;
use App\Mail\MeetingBookedParticipantConfirmation;
use App\Mail\MeetingCancelledAdminNotification;
use App\Mail\MeetingCancelledParticipantNotification;
use App\Mail\MeetingRescheduledAdminNotification;
use App\Mail\MeetingRescheduledParticipantNotification;
use App\Models\AdminMicrosoftConnection;
use App\Models\PlatformMeeting;
use App\Repositories\PlatformMeetingRepository;
use App\Services\Crm\PlatformMeetingCrmSyncService;
use App\Support\MeetingExtraAttendee;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class MeetingBookingService
{
    public function __construct(
        private readonly MeetingAvailabilityService $availability,
        private readonly PlatformMeetingRepository $meetings,
        private readonly MeetingProviderFactory $providerFactory,
        private readonly PlatformMeetingCrmSyncService $crmSync,
    ) {}

    public function book(BookMeetingDTO $dto): PlatformMeeting
    {
        $provider = $this->providerFactory->make($dto->meetingProvider);
        $provider->assertReady();

        if (!$this->availability->isSlotAvailable($dto->startTime, $dto->endTime, null, $dto->timezone)) {
            throw new BookingConflictException('Selected time slot is not available.');
        }

        $subject = $this->formatSubject($dto);
        $description = $this->formatDescription($dto);

        $meeting = DB::transaction(function () use ($dto, $provider, $subject, $description) {
            if ($this->meetings->hasConflict($dto->startTime, $dto->endTime)) {
                throw new BookingConflictException('This time slot has just been booked. Please choose another.');
            }

            $result = $provider->createMeeting($dto, $subject, $description);

            $organizerEmail = config('services.microsoft.admin_email');
            $connection = AdminMicrosoftConnection::current();
            if ($connection) {
                $organizerEmail = $connection->email;
            }

            $attendees = $dto->allAttendees();
            $additionalAttendees = count($attendees) > 1 ? array_slice($attendees, 1) : [];

            return $this->meetings->create([
                'user_id' => $dto->userId,
                'booking_type' => $dto->bookingType,
                'name' => $dto->name,
                'email' => $dto->email,
                'phone' => $dto->phone,
                'participants' => MeetingExtraAttendee::filterVisible($additionalAttendees),
                'meeting_type' => $dto->meetingType,
                'meeting_provider' => $result->provider,
                'event_id' => $result->eventId,
                'teams_meeting_id' => $result->teamsMeetingId,
                'teams_join_url' => $result->teamsJoinUrl,
                'provider_meeting_id' => $result->providerMeetingId,
                'provider_join_url' => $result->providerJoinUrl,
                'provider_start_url' => $result->providerStartUrl,
                'organizer_email' => $organizerEmail,
                'start_time' => $dto->startTime,
                'end_time' => $dto->endTime,
                'status' => 'scheduled',
                'notes' => $dto->notes,
                'timezone' => $dto->timezone,
            ]);
        });

        $this->crmSync->syncBooking($meeting);
        $this->sendNotifications($meeting);

        return $meeting;
    }

    public function reschedule(PlatformMeeting $meeting, BookMeetingDTO $dto): PlatformMeeting
    {
        if (!$meeting->isActive()) {
            throw new BookingConflictException('Only active meetings can be rescheduled.');
        }

        if (!$this->availability->isSlotAvailable($dto->startTime, $dto->endTime, $meeting->id, $dto->timezone)) {
            throw new BookingConflictException('Selected time slot is not available.');
        }

        $provider = $this->providerFactory->make($meeting->meeting_provider ?? 'teams');
        $subject = $this->formatSubject($dto);
        $description = $this->formatDescription($dto);
        $previousStart = $meeting->start_time?->copy();
        $previousEnd = $meeting->end_time?->copy();

        $updated = DB::transaction(function () use ($meeting, $dto, $provider, $subject, $description) {
            if ($this->meetings->hasConflict($dto->startTime, $dto->endTime, $meeting->id)) {
                throw new BookingConflictException('This time slot has just been booked. Please choose another.');
            }

            try {
                $provider->updateMeeting($meeting, $dto, $subject, $description);
            } catch (\Throwable) {
                // Persist local reschedule even if provider sync fails.
            }

            return $this->meetings->update($meeting, [
                'start_time' => $dto->startTime,
                'end_time' => $dto->endTime,
                'timezone' => $dto->timezone,
                'status' => 'rescheduled',
            ]);
        });

        $this->crmSync->syncReschedule($updated);
        $this->sendRescheduleNotifications($updated, $previousStart, $previousEnd);

        return $updated;
    }

    public function cancel(PlatformMeeting $meeting): PlatformMeeting
    {
        if ($meeting->status === 'cancelled') {
            throw new BookingConflictException('Meeting is already cancelled.');
        }

        $provider = $this->providerFactory->make($meeting->meeting_provider ?? 'teams');

        $cancelled = DB::transaction(function () use ($meeting, $provider) {
            try {
                $provider->cancelMeeting($meeting);
            } catch (\Throwable) {
                // Local cancellation should succeed even if provider sync fails.
            }

            return $this->meetings->update($meeting, ['status' => 'cancelled']);
        });

        $this->crmSync->syncCancellation($cancelled);
        $this->sendCancelNotifications($cancelled);

        return $cancelled;
    }

    private function formatSubject(BookMeetingDTO $dto): string
    {
        $typeLabel = ucwords(str_replace('_', ' ', $dto->meetingType));

        return "{$typeLabel} — {$dto->name}";
    }

    private function formatDescription(BookMeetingDTO $dto): string
    {
        $lines = [
            '<p><strong>Primary participant:</strong> ' . e($dto->name) . ' (' . e($dto->email) . ')</p>',
        ];

        if ($dto->phone) {
            $lines[] = '<p><strong>Phone:</strong> ' . e($dto->phone) . '</p>';
        }

        $lines[] = '<p><strong>Meeting type:</strong> ' . e($dto->meetingType) . '</p>';

        $extras = MeetingExtraAttendee::filterVisible(array_slice($dto->allAttendees(), 1));
        if (!empty($extras)) {
            $lines[] = '<p><strong>Additional participants:</strong></p><ul>';
            foreach ($extras as $participant) {
                $lines[] = '<li>' . e($participant['name']) . ' — ' . e($participant['email']) . '</li>';
            }
            $lines[] = '</ul>';
        }

        if ($dto->notes) {
            $discussionLabel = $dto->meetingType === 'discovery_call'
                ? 'What would you like to discuss?'
                : 'Notes';

            $lines[] = '<p><strong>' . e($discussionLabel) . '</strong></p>';

            if ($dto->meetingType === 'discovery_call') {
                $lines[] = '<ul>';
                $lines[] = '<li>Where are you right now in your property journey?</li>';
                $lines[] = '<li>What do you feel is the biggest bottleneck holding you back right now?</li>';
                $lines[] = '</ul>';
            }

            $lines[] = '<p>' . nl2br(e($dto->notes)) . '</p>';
        }

        return implode('', $lines);
    }

    private function sendNotifications(PlatformMeeting $meeting): void
    {
        $this->sendParticipantNotifications(
            $meeting,
            fn (string $recipient, string $recipientName) => new MeetingBookedParticipantConfirmation($meeting, $recipientName),
        );

        $this->sendAdminNotification(new MeetingBookedAdminNotification($meeting));
    }

    private function sendRescheduleNotifications(
        PlatformMeeting $meeting,
        ?\Carbon\Carbon $previousStart = null,
        ?\Carbon\Carbon $previousEnd = null,
    ): void {
        $attendeesByEmail = $this->attendeesByEmail($meeting);

        foreach ($this->notificationRecipients($meeting) as $recipient) {
            $recipientName = $attendeesByEmail->get($recipient)['name'] ?? $meeting->name;

            try {
                Mail::to($recipient)->send(new MeetingRescheduledParticipantNotification(
                    $meeting,
                    $recipientName,
                    $previousStart,
                    $previousEnd,
                ));
            } catch (\Throwable) {
                //
            }
        }

        $this->sendAdminNotification(new MeetingRescheduledAdminNotification(
            $meeting,
            $previousStart,
            $previousEnd,
        ));
    }

    private function sendCancelNotifications(PlatformMeeting $meeting): void
    {
        $this->sendParticipantNotifications(
            $meeting,
            fn (string $recipient, string $recipientName) => new MeetingCancelledParticipantNotification($meeting, $recipientName),
        );

        $this->sendAdminNotification(new MeetingCancelledAdminNotification($meeting));
    }

    /**
     * @return \Illuminate\Support\Collection<int, string>
     */
    private function notificationRecipients(PlatformMeeting $meeting): \Illuminate\Support\Collection
    {
        return collect($meeting->allAttendeesForNotifications())
            ->pluck('email')
            ->map(fn (string $email) => strtolower(trim($email)))
            ->filter()
            ->unique()
            ->values();
    }

    /**
     * @return \Illuminate\Support\Collection<string, array{name: string, email: string}>
     */
    private function attendeesByEmail(PlatformMeeting $meeting): \Illuminate\Support\Collection
    {
        return collect($meeting->allAttendeesForNotifications())->keyBy(
            fn (array $attendee) => strtolower(trim($attendee['email']))
        );
    }

    private function sendAdminNotification(object $mailable): void
    {
        $adminEmail = config('services.microsoft.admin_email');

        if (!$adminEmail) {
            return;
        }

        try {
            Mail::to($adminEmail)->send($mailable);
        } catch (\Throwable) {
            //
        }
    }

    /**
     * @param  callable(string, string): object  $mailableFactory
     */
    private function sendParticipantNotifications(PlatformMeeting $meeting, callable $mailableFactory): void
    {
        $attendeesByEmail = $this->attendeesByEmail($meeting);

        foreach ($this->notificationRecipients($meeting) as $recipient) {
            $recipientName = $attendeesByEmail->get($recipient)['name'] ?? $meeting->name;

            try {
                Mail::to($recipient)->send($mailableFactory($recipient, $recipientName));
            } catch (\Throwable) {
                //
            }
        }
    }
}
