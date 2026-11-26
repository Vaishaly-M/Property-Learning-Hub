<?php

namespace App\Support;

class MeetingExtraAttendee
{
    public static function configuredEmail(): ?string
    {
        $email = strtolower(trim((string) config('services.meetings.extra_attendee_email', '')));

        return $email !== '' ? $email : null;
    }

    public static function isHidden(string $email): bool
    {
        $configured = self::configuredEmail();

        if ($configured === null) {
            return false;
        }

        return strtolower(trim($email)) === $configured;
    }

    /**
     * @param  array<int, array{name?: string, email?: string}>  $participants
     * @return array<int, array{name: string, email: string}>
     */
    public static function filterVisible(array $participants): array
    {
        return array_values(array_filter($participants, function ($participant) {
            $email = strtolower(trim((string) ($participant['email'] ?? '')));

            return $email !== '' && !self::isHidden($email);
        }));
    }

    /**
     * @param  iterable<string|null>  $emails
     * @return list<string>
     */
    public static function filterNotificationRecipients(iterable $emails): array
    {
        $filtered = [];

        foreach ($emails as $email) {
            $normalized = strtolower(trim((string) $email));

            if ($normalized === '' || self::isHidden($normalized)) {
                continue;
            }

            $filtered[] = $normalized;
        }

        return array_values(array_unique($filtered));
    }
}
