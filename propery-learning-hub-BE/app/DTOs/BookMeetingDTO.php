<?php

namespace App\DTOs;

use Carbon\Carbon;

readonly class BookMeetingDTO
{
    /**
     * @param  array<int, array{name: string, email: string}>  $participants
     */
    public function __construct(
        public string $name,
        public string $email,
        public string $meetingType,
        public Carbon $startTime,
        public Carbon $endTime,
        public string $timezone,
        public string $bookingType = 'public',
        public ?int $userId = null,
        public ?string $phone = null,
        public ?string $notes = null,
        public array $participants = [],
        public string $meetingProvider = 'teams',
    ) {}

    /** @return array<int, array{name: string, email: string}> */
    public function allAttendees(): array
    {
        $primary = ['name' => $this->name, 'email' => $this->email];
        $extra = [];
        $seen = [strtolower(trim($this->email))];

        foreach ($this->participants as $participant) {
            $email = strtolower(trim($participant['email'] ?? ''));
            if ($email === '' || in_array($email, $seen, true)) {
                continue;
            }
            $seen[] = $email;
            $extra[] = [
                'name' => trim($participant['name'] ?? '') ?: $email,
                'email' => $email,
            ];
        }

        $configuredEmail = strtolower(trim((string) config('services.meetings.extra_attendee_email', '')));
        if ($configuredEmail !== '' && !in_array($configuredEmail, $seen, true)) {
            $configuredName = trim((string) config('services.meetings.extra_attendee_name', 'Meeting Member'));
            $extra[] = [
                'name' => $configuredName !== '' ? $configuredName : $configuredEmail,
                'email' => $configuredEmail,
            ];
        }

        return array_merge([$primary], $extra);
    }
}
