<?php

namespace App\Services;

use App\Models\Contact;
use App\Models\ContactActivity;

class ContactActivityService
{
    public function log(
        Contact $contact,
        string $activityType,
        string $title,
        ?string $description = null,
        array $metadata = [],
        ?int $performedBy = null
    ): ContactActivity {
        $contact->update(['last_activity_date' => now()]);

        return ContactActivity::create([
            'contact_id' => $contact->id,
            'activity_type' => $activityType,
            'title' => $title,
            'description' => $description,
            'metadata' => empty($metadata) ? null : $metadata,
            'performed_by' => $performedBy,
            'happened_at' => now(),
        ]);
    }
}
