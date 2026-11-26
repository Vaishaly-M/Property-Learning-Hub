<?php

namespace App\Services\Crm;

use App\Models\Contact;
use App\Models\ContactActivity;

class ContactActivityService
{
    public static function log(
        Contact $contact,
        string $type,
        string $title,
        ?string $description = null,
        ?array $metadata = null,
        ?int $performedBy = null
    ): ContactActivity {
        return ContactActivity::create([
            'contact_id'    => $contact->id,
            'activity_type' => $type,
            'title'         => $title,
            'description'   => $description,
            'metadata'      => $metadata,
            'performed_by'  => $performedBy ?? auth()->id(),
            'happened_at'   => now(),
        ]);
    }
}
