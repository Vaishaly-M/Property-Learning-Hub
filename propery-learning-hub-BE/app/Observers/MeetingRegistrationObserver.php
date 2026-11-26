<?php

namespace App\Observers;

use App\Models\Meeting;
use App\Models\MeetingRegistration;
use App\Services\Crm\ClassificationWorkflowService;
use App\Services\Crm\ContactActivityService;
use App\Services\Crm\CrmContactSyncService;

class MeetingRegistrationObserver
{
    public function created(MeetingRegistration $registration): void
    {
        $learner = $registration->learner;
        $meeting = $registration->meeting;
        if (! $learner || ! $meeting) {
            return;
        }

        $contact = app(CrmContactSyncService::class)->findOrCreateFromUser($learner, 'meeting registration');

        $typeLabel = match ($meeting->type ?? '') {
            'discovery' => 'Discovery call booked',
            'coaching'  => 'Coaching session booked',
            'mentor'    => 'Mentor meeting booked',
            default     => "Meeting booked: {$meeting->title}",
        };

        ContactActivityService::log(
            $contact,
            'coaching_session',
            $typeLabel,
            $meeting->title,
            ['meeting_id' => $meeting->id, 'meeting_type' => $meeting->type]
        );

        app(ClassificationWorkflowService::class)->applyRules($contact, 'meeting_registered', [
            'meeting_type' => $meeting->type,
        ]);
    }

    public function updated(MeetingRegistration $registration): void
    {
        if ($registration->status !== 'approved' || ! $registration->wasChanged('status')) {
            return;
        }

        $learner = $registration->learner;
        $meeting = $registration->meeting;
        if (! $learner || ! $meeting) {
            return;
        }

        $contact = app(CrmContactSyncService::class)->findOrCreateFromUser($learner, 'meeting approved');

        ContactActivityService::log(
            $contact,
            'coaching_session',
            "Meeting confirmed: {$meeting->title}",
            null,
            ['meeting_id' => $meeting->id]
        );
    }
}
