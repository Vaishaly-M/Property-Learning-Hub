<?php

namespace App\Observers;

use App\Models\ContactWebinarRegistration;
use App\Models\WebinarRegistration;
use App\Services\Crm\ClassificationWorkflowService;
use App\Services\Crm\ContactActivityService;
use App\Services\Crm\CrmContactSyncService;
use App\Services\Crm\WebinarAutomationService;

class WebinarRegistrationObserver
{
    public function created(WebinarRegistration $registration): void
    {
        $learner = $registration->learner;
        $webinar = $registration->webinar;
        if (! $learner || ! $webinar) {
            return;
        }

        $contact = app(CrmContactSyncService::class)->findOrCreateFromUser($learner, 'webinar registration');

        $crmReg = ContactWebinarRegistration::firstOrCreate(
            ['webinar_id' => $webinar->id, 'contact_id' => $contact->id],
            ['status' => 'registered', 'registered_at' => now()]
        );

        if ($crmReg->wasRecentlyCreated) {
            $existing = $contact->classifications()->pluck('classification')->toArray();
            if (! in_array('webinar_registrant', $existing)) {
                $existing[] = 'webinar_registrant';
                $contact->syncClassifications($existing);
            }

            ContactActivityService::log(
                $contact,
                'webinar_registered',
                "Registered for webinar (platform sync): {$webinar->title}",
                null,
                ['webinar_id' => $webinar->id]
            );

            app(WebinarAutomationService::class)->sendRegistrationConfirmation($crmReg);
            app(ClassificationWorkflowService::class)->applyRules($contact, 'webinar_registered');
        }
    }

    public function updated(WebinarRegistration $registration): void
    {
        if (! $registration->wasChanged('attended')) {
            return;
        }

        $learner = $registration->learner;
        $webinar = $registration->webinar;
        if (! $learner || ! $webinar) {
            return;
        }

        $contact = app(CrmContactSyncService::class)->findOrCreateFromUser($learner, 'webinar attendance');
        $crmReg = ContactWebinarRegistration::where('webinar_id', $webinar->id)
            ->where('contact_id', $contact->id)
            ->first();

        if ($crmReg) {
            $crmReg->update([
                'attended' => (bool) $registration->attended,
                'no_show'  => ! $registration->attended,
            ]);

            if ($registration->attended) {
                ContactActivityService::log($contact, 'webinar_attended', "Attended webinar: {$webinar->title}");
            }
        }
    }
}
