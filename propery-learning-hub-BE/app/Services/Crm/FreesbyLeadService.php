<?php

namespace App\Services\Crm;

use App\Models\Contact;

class FreesbyLeadService
{
    public function __construct(
        private readonly CrmContactSyncService $contacts,
    ) {}

    public function captureTemplateRequest(
        string $fullName,
        string $email,
        ?string $phone,
        string $templateName,
    ): Contact {
        $contact = $this->contacts->findOrCreateFromBooking(
            $fullName,
            $email,
            $phone,
            null,
            'Freesby template request',
        );

        $this->addClassification($contact, 'freesby');

        ContactActivityService::log(
            $contact,
            'note_added',
            'Freesby template requested',
            "Requested template: {$templateName}",
            [
                'template' => $templateName,
                'source' => 'freesby',
            ],
        );

        return $contact->fresh(['classifications']);
    }

    private function addClassification(Contact $contact, string $classification): void
    {
        $existing = $contact->classifications()->pluck('classification')->toArray();

        if (in_array($classification, $existing, true)) {
            return;
        }

        $existing[] = $classification;
        $contact->syncClassifications($existing);

        ContactActivityService::log(
            $contact,
            'classification_changed',
            'Classification added',
            $classification,
        );
    }
}
