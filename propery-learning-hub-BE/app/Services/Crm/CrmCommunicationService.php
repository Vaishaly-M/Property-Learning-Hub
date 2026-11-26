<?php

namespace App\Services\Crm;

use App\Mail\CrmCommunicationMail;
use App\Models\Communication;
use App\Models\Contact;
use App\Models\ContactWebinarRegistration;
use App\Models\CrmEventRegistration;
use App\Models\Membership;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class CrmCommunicationService
{
    public function resolveAudience(string $filter, array $params = [], ?array $contactIds = null): array
    {
        if ($filter === 'custom' && ! empty($contactIds)) {
            return $contactIds;
        }

        if ($filter === 'custom' && ! empty($params['contact_ids'])) {
            return array_map('intval', $params['contact_ids']);
        }

        return match ($filter) {
            'all_contacts' => Contact::where('status', 'active')->pluck('id')->toArray(),
            'all_admins' => Contact::whereHas('user', fn ($q) => $q->whereIn('role', ['admin', 'super_admin']))->pluck('id')->toArray(),
            'all_members' => Contact::whereHas('memberships')->pluck('id')->toArray(),
            'active_members' => Contact::whereHas('memberships', fn ($q) => $q->where('status', 'active'))->pluck('id')->toArray(),
            'vip_members' => $this->vipMembers($params),
            'webinar_attendees' => $this->webinarAttendees($params),
            'leads' => Contact::whereHas('classifications', fn ($q) => $q->where('classification', 'lead'))->pluck('id')->toArray(),
            'former_members' => Contact::whereHas('classifications', fn ($q) => $q->where('classification', 'former_member'))->pluck('id')->toArray(),
            default => Contact::where('status', 'active')->pluck('id')->toArray(),
        };
    }

    public function attachRecipients(Communication $communication, array $contactIds): void
    {
        foreach ($contactIds as $contactId) {
            $communication->recipients()->firstOrCreate(['contact_id' => $contactId]);
        }
        $communication->update(['recipient_count' => count($contactIds)]);
    }

    public function send(Communication $communication, array $contactIds): int
    {
        $sent = 0;

        DB::transaction(function () use ($communication, $contactIds, &$sent) {
            $communication->update(['status' => 'sending']);

            foreach ($contactIds as $contactId) {
                $contact = Contact::find($contactId);
                if (! $contact || ! $contact->email) {
                    $communication->recipients()->where('contact_id', $contactId)->update(['status' => 'failed']);
                    continue;
                }

                try {
                    Mail::to($contact->email)->send(new CrmCommunicationMail($communication, $contact));
                    $communication->recipients()->where('contact_id', $contactId)->update([
                        'status'  => 'sent',
                        'sent_at' => now(),
                    ]);
                    ContactActivityService::log(
                        $contact,
                        'email_sent',
                        "Email sent: {$communication->subject}",
                        $communication->type
                    );
                    $sent++;
                } catch (\Throwable $e) {
                    Log::error('CRM email send failed', [
                        'communication_id' => $communication->id,
                        'contact_id'         => $contactId,
                        'error'              => $e->getMessage(),
                    ]);
                    $communication->recipients()->where('contact_id', $contactId)->update(['status' => 'failed']);
                }
            }

            $communication->update([
                'status'  => 'sent',
                'sent_at' => now(),
            ]);
        });

        return $sent;
    }

    private function vipMembers(array $params): array
    {
        $query = Membership::where('type', 'vip_mentorship')->where('status', 'active');

        if (! empty($params['membership_type'])) {
            $query = Membership::where('type', $params['membership_type'])->where('status', 'active');
        }

        return $query->pluck('contact_id')->unique()->toArray();
    }

    private function webinarAttendees(array $params): array
    {
        $query = ContactWebinarRegistration::query();

        if (! empty($params['webinar_id'])) {
            $query->where('webinar_id', $params['webinar_id']);
        }

        if (! empty($params['attended_only'])) {
            $query->where('attended', true);
        }

        return $query->pluck('contact_id')->unique()->toArray();
    }
}
