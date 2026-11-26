<?php

namespace App\Services\Crm;

use App\Models\Contact;
use App\Models\Membership;
use App\Models\MembershipHistory;

class MembershipHistoryService
{
    public static function record(Membership $membership, string $action, ?int $performedBy = null): void
    {
        MembershipHistory::create([
            'membership_id' => $membership->id,
            'contact_id'    => $membership->contact_id,
            'action'        => $action,
            'snapshot'      => $membership->only([
                'type', 'status', 'start_date', 'renewal_date', 'expiry_date',
                'payment_status', 'amount', 'notes',
            ]),
            'performed_by'  => $performedBy ?? auth()->id(),
        ]);
    }
}
