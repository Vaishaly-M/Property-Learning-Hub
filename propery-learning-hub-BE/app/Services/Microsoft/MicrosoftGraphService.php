<?php

namespace App\Services\Microsoft;

use App\Exceptions\MicrosoftAccountNotConnectedException;
use App\Exceptions\MicrosoftGraphException;
use App\Models\MicrosoftAccount;
use App\Models\User;
use App\Repositories\MicrosoftAccountRepository;
use App\Support\MicrosoftHttpClient;
use Carbon\Carbon;

class MicrosoftGraphService
{
    public function __construct(
        private readonly MicrosoftAccountRepository $accounts,
    ) {}

    public function getAccountForUser(User $user): MicrosoftAccount
    {
        $account = $this->accounts->findByUserId($user->id);

        if (!$account) {
            throw new MicrosoftAccountNotConnectedException(
                'Please connect your Microsoft account before using calendar features.'
            );
        }

        return $account;
    }

    public function getAccessToken(User $user): string
    {
        $account = $this->getAccountForUser($user);

        if ($account->expiresWithinMinutes(5)) {
            $account = $this->refreshAccessToken($account);
        }

        return $account->access_token;
    }

    public function refreshAccessToken(MicrosoftAccount $account): MicrosoftAccount
    {
        $response = MicrosoftHttpClient::client()->asForm()->post($this->authorityUrl() . '/token', [
            'client_id' => config('services.microsoft.client_id'),
            'client_secret' => config('services.microsoft.client_secret'),
            'grant_type' => 'refresh_token',
            'refresh_token' => $account->refresh_token,
            'scope' => implode(' ', config('services.microsoft.scopes')),
        ]);

        if ($response->failed()) {
            throw new MicrosoftGraphException(
                'Failed to refresh Microsoft access token. Please reconnect your account.',
                $response->status(),
                $response->json()
            );
        }

        $data = $response->json();

        $account->access_token = $data['access_token'];
        if (!empty($data['refresh_token'])) {
            $account->refresh_token = $data['refresh_token'];
        }
        $account->expires_at = now()->addSeconds((int) ($data['expires_in'] ?? 3600));
        $account->save();

        return $account->fresh();
    }

    public function getUserProfile(User $user): array
    {
        return $this->getUserProfileWithToken($this->getAccessToken($user));
    }

    public function getUserProfileWithToken(string $accessToken): array
    {
        $response = $this->graphRequest('GET', '/me', $accessToken);

        return $response->json();
    }

    public function getSchedule(User $mentor, Carbon $start, Carbon $end, string $timezone = 'UTC'): array
    {
        $account = $this->getAccountForUser($mentor);
        $accessToken = $this->getAccessToken($mentor);

        $response = $this->graphRequest('POST', '/me/calendar/getSchedule', $accessToken, [
            'schedules' => [$account->email],
            'startTime' => [
                'dateTime' => $start->copy()->timezone($timezone)->format('Y-m-d\TH:i:s'),
                'timeZone' => $timezone,
            ],
            'endTime' => [
                'dateTime' => $end->copy()->timezone($timezone)->format('Y-m-d\TH:i:s'),
                'timeZone' => $timezone,
            ],
            'availabilityViewInterval' => config('services.microsoft.slot_duration_minutes', 30),
        ]);

        return $response->json('value.0.scheduleItems', []);
    }

    public function getCalendarEvents(User $mentor, Carbon $start, Carbon $end): array
    {
        $accessToken = $this->getAccessToken($mentor);

        $response = $this->graphRequest('GET', '/me/calendarView', $accessToken, null, [
            'startDateTime' => $start->toIso8601String(),
            'endDateTime' => $end->toIso8601String(),
            '$orderby' => 'start/dateTime',
        ]);

        return $response->json('value', []);
    }

    public function createTeamsMeeting(User $mentor, array $payload): array
    {
        $accessToken = $this->getAccessToken($mentor);

        $response = $this->graphRequest('POST', '/me/onlineMeetings', $accessToken, [
            'startDateTime' => $payload['start_time'],
            'endDateTime' => $payload['end_time'],
            'subject' => $payload['subject'],
        ]);

        if ($response->failed()) {
            throw new MicrosoftGraphException(
                'Failed to create Teams meeting.',
                $response->status(),
                $response->json()
            );
        }

        return $response->json();
    }

    public function createCalendarEvent(User $mentor, array $payload): array
    {
        $accessToken = $this->getAccessToken($mentor);

        $body = [
            'subject' => $payload['subject'],
            'body' => [
                'contentType' => 'HTML',
                'content' => $payload['description'] ?? '',
            ],
            'start' => [
                'dateTime' => $payload['start_time'],
                'timeZone' => $payload['timezone'] ?? 'UTC',
            ],
            'end' => [
                'dateTime' => $payload['end_time'],
                'timeZone' => $payload['timezone'] ?? 'UTC',
            ],
            'attendees' => collect($payload['attendees'] ?? [])->map(fn ($email) => [
                'emailAddress' => ['address' => $email],
                'type' => 'required',
            ])->values()->all(),
            'isOnlineMeeting' => true,
            'onlineMeetingProvider' => 'teamsForBusiness',
        ];

        if (!empty($payload['join_url'])) {
            $body['onlineMeeting'] = ['joinUrl' => $payload['join_url']];
        }

        $response = $this->graphRequest('POST', '/me/events', $accessToken, $body);

        if ($response->failed()) {
            throw new MicrosoftGraphException(
                'Failed to create calendar event.',
                $response->status(),
                $response->json()
            );
        }

        return $response->json();
    }

    public function updateCalendarEvent(User $mentor, string $eventId, array $payload): array
    {
        $accessToken = $this->getAccessToken($mentor);

        $body = [];
        if (isset($payload['subject'])) {
            $body['subject'] = $payload['subject'];
        }
        if (isset($payload['description'])) {
            $body['body'] = ['contentType' => 'HTML', 'content' => $payload['description']];
        }
        if (isset($payload['start_time'])) {
            $body['start'] = [
                'dateTime' => $payload['start_time'],
                'timeZone' => $payload['timezone'] ?? 'UTC',
            ];
        }
        if (isset($payload['end_time'])) {
            $body['end'] = [
                'dateTime' => $payload['end_time'],
                'timeZone' => $payload['timezone'] ?? 'UTC',
            ];
        }

        $response = $this->graphRequest('PATCH', "/me/events/{$eventId}", $accessToken, $body);

        if ($response->failed()) {
            throw new MicrosoftGraphException(
                'Failed to update calendar event.',
                $response->status(),
                $response->json()
            );
        }

        return $response->json();
    }

    public function deleteCalendarEvent(User $mentor, string $eventId): void
    {
        $accessToken = $this->getAccessToken($mentor);

        $response = $this->graphRequest('DELETE', "/me/events/{$eventId}", $accessToken);

        if ($response->failed() && $response->status() !== 404) {
            throw new MicrosoftGraphException(
                'Failed to delete calendar event.',
                $response->status(),
                $response->json()
            );
        }
    }

    private function graphRequest(
        string $method,
        string $path,
        string $accessToken,
        ?array $body = null,
        array $query = []
    ) {
        $url = rtrim(config('services.microsoft.graph_base_url'), '/') . $path;

        $request = MicrosoftHttpClient::client()->withToken($accessToken)
            ->acceptJson()
            ->timeout(30);

        $response = match (strtoupper($method)) {
            'GET' => $request->get($url, $query),
            'POST' => $request->post($url, $body ?? []),
            'PATCH' => $request->patch($url, $body ?? []),
            'DELETE' => $request->delete($url),
            default => throw new MicrosoftGraphException("Unsupported HTTP method: {$method}", 500),
        };

        return $response;
    }

    private function authorityUrl(): string
    {
        $tenant = config('services.microsoft.tenant_id', 'common');

        return "https://login.microsoftonline.com/{$tenant}/oauth2/v2.0";
    }
}
