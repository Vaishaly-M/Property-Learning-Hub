<?php

namespace App\Services\Crm;

use App\Models\Contact;
use App\Models\User;

class CrmContactSyncService
{
    public function findOrCreateFromUser(User $user, ?string $source = null): Contact
    {
        $existing = Contact::where('user_id', $user->id)->first();
        if ($existing) {
            return $existing;
        }

        if ($user->email) {
            $byEmail = Contact::where('email', $user->email)->first();
            if ($byEmail) {
                $byEmail->update(['user_id' => $user->id]);

                return $byEmail;
            }
        }

        $contact = Contact::create([
            'contact_ref'  => Contact::generateContactRef(),
            'first_name'   => $user->first_name,
            'last_name'    => $user->last_name,
            'email'        => $user->email,
            'phone_number' => $user->phone_number,
            'status'       => 'active',
            'user_id'      => $user->id,
            'notes'        => $source ? "Auto-created from {$source}" : 'Auto-created from platform',
        ]);

        ContactActivityService::log($contact, 'contact_created', 'Contact auto-created from platform', $source);

        return $contact;
    }

    public function findOrCreateFromBooking(
        string $name,
        string $email,
        ?string $phone = null,
        ?int $userId = null,
        ?string $source = null,
    ): Contact {
        if ($userId) {
            $user = User::find($userId);
            if ($user) {
                $contact = $this->findOrCreateFromUser($user, $source);
                if ($phone && ! $contact->phone_number) {
                    $contact->update(['phone_number' => $phone]);
                }

                return $contact;
            }
        }

        $email = strtolower(trim($email));
        if ($email === '') {
            throw new \InvalidArgumentException('Email is required to sync a CRM contact from a meeting booking.');
        }

        $existing = Contact::where('email', $email)->first();
        if ($existing) {
            if ($userId && ! $existing->user_id) {
                $existing->update(['user_id' => $userId]);
            }

            if ($phone && ! $existing->phone_number) {
                $existing->update(['phone_number' => $phone]);
            }

            return $existing;
        }

        [$firstName, $lastName] = $this->splitName($name);

        $contact = Contact::create([
            'contact_ref'  => Contact::generateContactRef(),
            'first_name'   => $firstName,
            'last_name'    => $lastName,
            'email'        => $email,
            'phone_number' => $phone,
            'status'       => 'active',
            'user_id'      => $userId,
            'notes'        => $source ? "Auto-created from {$source}" : 'Auto-created from platform meeting booking',
        ]);

        ContactActivityService::log($contact, 'contact_created', 'Contact auto-created from platform', $source);

        return $contact;
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function splitName(string $name): array
    {
        $name = trim($name);
        if ($name === '') {
            return ['Guest', ''];
        }

        $parts = preg_split('/\s+/', $name, 2);

        return [$parts[0], $parts[1] ?? ''];
    }
}
