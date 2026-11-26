<?php

namespace App\Services\Crm;

use App\Mail\WebinarFollowUpMail;
use App\Mail\WebinarRegistrationConfirmationMail;
use App\Mail\WebinarReminderMail;
use App\Models\Contact;
use App\Models\ContactWebinarRegistration;
use App\Models\Webinar;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class WebinarAutomationService
{
    public function sendRegistrationConfirmation(ContactWebinarRegistration $registration): void
    {
        if ($registration->confirmation_sent_at) {
            return;
        }

        $contact = $registration->contact;
        $webinar = $registration->webinar;

        if (! $contact?->email || ! $webinar) {
            return;
        }

        try {
            Mail::to($contact->email)->send(new WebinarRegistrationConfirmationMail($webinar, $contact));
            $registration->update(['confirmation_sent_at' => now()]);
            ContactActivityService::log($contact, 'email_sent', "Webinar confirmation: {$webinar->title}", 'webinar_invitation');
        } catch (\Throwable $e) {
            Log::error('Webinar confirmation email failed', ['registration_id' => $registration->id, 'error' => $e->getMessage()]);
        }
    }

    public function sendReminders(): int
    {
        $count = 0;
        $windowStart = now();
        $windowEnd = now()->addHours(24);

        $registrations = ContactWebinarRegistration::with(['contact', 'webinar'])
            ->whereNull('reminder_sent_at')
            ->whereHas('webinar', function ($q) use ($windowStart, $windowEnd) {
                $q->where('status', 'upcoming')
                    ->whereRaw("CONCAT(date, ' ', time) BETWEEN ? AND ?", [
                        $windowStart->format('Y-m-d H:i:s'),
                        $windowEnd->format('Y-m-d H:i:s'),
                    ]);
            })
            ->get();

        foreach ($registrations as $registration) {
            $contact = $registration->contact;
            $webinar = $registration->webinar;
            if (! $contact?->email || ! $webinar) {
                continue;
            }

            try {
                Mail::to($contact->email)->send(new WebinarReminderMail($webinar, $contact));
                $registration->update(['reminder_sent_at' => now()]);
                ContactActivityService::log($contact, 'email_sent', "Webinar reminder: {$webinar->title}", 'webinar_invitation');
                $count++;
            } catch (\Throwable $e) {
                Log::error('Webinar reminder failed', ['registration_id' => $registration->id, 'error' => $e->getMessage()]);
            }
        }

        return $count;
    }

    public function sendFollowUps(): int
    {
        $count = 0;

        $registrations = ContactWebinarRegistration::with(['contact', 'webinar'])
            ->whereNull('follow_up_sent_at')
            ->whereHas('webinar', fn ($q) => $q->where('status', 'completed'))
            ->get();

        foreach ($registrations as $registration) {
            $contact = $registration->contact;
            $webinar = $registration->webinar;
            if (! $contact?->email || ! $webinar) {
                continue;
            }

            try {
                Mail::to($contact->email)->send(new WebinarFollowUpMail($webinar, $contact, (bool) $registration->attended));
                $registration->update(['follow_up_sent_at' => now()]);
                ContactActivityService::log($contact, 'email_sent', "Webinar follow-up: {$webinar->title}", 'follow_up_sequence');
                $count++;

                app(ClassificationWorkflowService::class)->applyRules($contact, 'webinar_completed', [
                    'attended' => (bool) $registration->attended,
                ]);
            } catch (\Throwable $e) {
                Log::error('Webinar follow-up failed', ['registration_id' => $registration->id, 'error' => $e->getMessage()]);
            }
        }

        return $count;
    }
}
