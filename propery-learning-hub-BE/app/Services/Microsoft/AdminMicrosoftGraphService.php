<?php

namespace App\Services\Microsoft;

use App\Exceptions\MicrosoftGraphException;
use App\Models\AdminMicrosoftConnection;
use App\Support\MicrosoftHttpClient;
use Carbon\Carbon;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Microsoft Graph client using client-credentials flow.
 * All calendar operations run against the admin mailbox from environment config.
 */
class AdminMicrosoftGraphService
{
    public const TOKEN_CACHE_KEY = 'microsoft_admin_access_token';

    public function __construct(
        private readonly AdminMicrosoftOAuthService $oauth,
    ) {}

    public function isOAuthConnected(): bool
    {
        if ($this->usesAppOnlyAuth()) {
            return false;
        }

        return AdminMicrosoftConnection::current() !== null;
    }

    private function usesAppOnlyAuth(): bool
    {
        return config('services.microsoft.auth_mode', 'app_only') === 'app_only';
    }

    private function azureAdminConsentMessage(): string
    {
        return 'In Azure Portal → App registrations → API permissions → Application: add '
            . 'Calendars.ReadWrite, OnlineMeetings.ReadWrite.All, and User.Read.All, '
            . 'then click Grant admin consent for your tenant. .env keys alone do not grant calendar access.';
    }

    /**
     * @return array{
     *   ready: bool,
     *   mode: 'oauth'|'app_only'|'none',
     *   admin_email: string|null,
     *   message: string,
     *   application_roles: string[]
     * }
     */
    public function getConnectionStatus(): array
    {
        $adminEmail = config('services.microsoft.admin_email');

        if ($this->isOAuthConnected()) {
            $connection = AdminMicrosoftConnection::current();

            return [
                'ready' => true,
                'mode' => 'oauth',
                'admin_email' => $connection?->email ?? $adminEmail,
                'message' => 'Connected via Microsoft sign-in. Bookings use the admin calendar.',
                'application_roles' => [],
            ];
        }

        $roles = $this->getClientCredentialsRoles();

        if (!empty(array_intersect($roles, ['Calendars.ReadWrite', 'Calendars.ReadWrite.All']))) {
            return [
                'ready' => true,
                'mode' => 'app_only',
                'admin_email' => $adminEmail,
                'message' => 'Using .env app credentials (client ID + secret). No Connect button needed.',
                'application_roles' => $roles,
            ];
        }

        $hasKeys = (bool) (
            config('services.microsoft.client_id')
            && config('services.microsoft.client_secret')
            && config('services.microsoft.tenant_id')
            && $adminEmail
        );

        return [
            'ready' => false,
            'mode' => 'none',
            'admin_email' => $adminEmail,
            'message' => $hasKeys
                ? '.env keys are set. ' . $this->azureAdminConsentMessage()
                : 'Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, and ADMIN_EMAIL in .env.',
            'application_roles' => $roles,
        ];
    }

    /** @return string[] */
    private function getClientCredentialsRoles(): array
    {
        try {
            $token = $this->getClientCredentialsToken();
        } catch (\Throwable) {
            return [];
        }

        $parts = explode('.', $token);
        $payload = json_decode(base64_decode(strtr($parts[1] ?? '', '-_', '+/')), true) ?: [];

        return $payload['roles'] ?? [];
    }

    /**
     * Verify the app can access the admin calendar before attempting a booking.
     */
    public function assertReadyForBooking(): void
    {
        if ($this->isOAuthConnected()) {
            return;
        }

        try {
            $token = $this->getClientCredentialsToken();
        } catch (MicrosoftGraphException $e) {
            throw new MicrosoftGraphException(
                'Microsoft Graph token failed. Check MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID in .env. '
                . $this->azureAdminConsentMessage(),
                503,
                $e->graphError
            );
        }

        $parts = explode('.', $token);
        $payload = json_decode(base64_decode(strtr($parts[1] ?? '', '-_', '+/')), true) ?: [];
        $roles = $payload['roles'] ?? [];

        $hasCalendarRole = !empty(array_intersect($roles, [
            'Calendars.ReadWrite',
            'Calendars.ReadWrite.All',
        ]));

        if (!$hasCalendarRole) {
            throw new MicrosoftGraphException(
                'Microsoft calendar permissions are missing from the app token. ' . $this->azureAdminConsentMessage(),
                503
            );
        }
    }

    public function getAccessToken(): string
    {
        if (!$this->usesAppOnlyAuth()) {
            $connection = AdminMicrosoftConnection::current();

            if ($connection) {
                if ($connection->expiresWithinMinutes(5)) {
                    $connection = $this->oauth->refreshConnection($connection);
                }

                return $connection->access_token;
            }
        }

        return $this->getClientCredentialsToken();
    }

    private function getClientCredentialsToken(): string
    {
        $cached = Cache::get(self::TOKEN_CACHE_KEY);

        if (is_array($cached) && !empty($cached['token']) && ($cached['expires_at'] ?? 0) > time() + 60) {
            return $cached['token'];
        }

        try {
            $response = MicrosoftHttpClient::client()->asForm()->post($this->authorityUrl() . '/token', [
                'client_id' => config('services.microsoft.client_id'),
                'client_secret' => config('services.microsoft.client_secret'),
                'scope' => 'https://graph.microsoft.com/.default',
                'grant_type' => 'client_credentials',
            ]);
        } catch (ConnectionException $e) {
            throw $this->connectionException($e);
        }

        if ($response->failed()) {
            throw new MicrosoftGraphException(
                'Failed to obtain Microsoft Graph access token. Verify .env credentials and ' . $this->azureAdminConsentMessage(),
                MicrosoftGraphException::clientStatus($response->status()),
                $response->json()
            );
        }

        $data = $response->json();
        $token = $data['access_token'];
        $expiresIn = (int) ($data['expires_in'] ?? 3600);

        Cache::put(self::TOKEN_CACHE_KEY, [
            'token' => $token,
            'expires_at' => time() + $expiresIn,
        ], max(60, $expiresIn - 120));

        return $token;
    }

    public function getCalendarUserPath(): string
    {
        $connection = AdminMicrosoftConnection::current();

        if ($connection) {
            return '/me';
        }

        return '/users/' . $this->adminEmail();
    }

    public function getSchedule(Carbon $start, Carbon $end, string $timezone): array
    {
        $calendarUser = $this->calendarUserEmail();

        $response = $this->graphRequest('POST', $this->getCalendarUserPath() . '/calendar/getSchedule', [
            'schedules' => [$calendarUser],
            'startTime' => [
                'dateTime' => $start->copy()->timezone($timezone)->format('Y-m-d\TH:i:s'),
                'timeZone' => $timezone,
            ],
            'endTime' => [
                'dateTime' => $end->copy()->timezone($timezone)->format('Y-m-d\TH:i:s'),
                'timeZone' => $timezone,
            ],
            'availabilityViewInterval' => (int) config('services.microsoft.slot_duration_minutes', 30),
        ]);

        if ($response->failed()) {
            throw new MicrosoftGraphException(
                'Failed to fetch admin calendar schedule.',
                MicrosoftGraphException::clientStatus($response->status()),
                $response->json()
            );
        }

        return $response->json('value.0.scheduleItems', []);
    }

    public function getCalendarEvents(Carbon $start, Carbon $end): array
    {
        $response = $this->graphRequest('GET', $this->getCalendarUserPath() . '/calendarView', null, [
            'startDateTime' => $start->toIso8601String(),
            'endDateTime' => $end->toIso8601String(),
            '$orderby' => 'start/dateTime',
        ]);

        if ($response->failed()) {
            throw new MicrosoftGraphException(
                'Failed to fetch admin calendar events.',
                MicrosoftGraphException::clientStatus($response->status()),
                $response->json()
            );
        }

        return $response->json('value', []);
    }

    public function createCalendarEvent(array $payload): array
    {
        $body = [
            'subject' => $payload['subject'],
            'body' => [
                'contentType' => 'HTML',
                'content' => $payload['description'] ?? '',
            ],
            'start' => [
                'dateTime' => $payload['start_time'],
                'timeZone' => $payload['timezone'] ?? config('services.microsoft.default_timezone'),
            ],
            'end' => [
                'dateTime' => $payload['end_time'],
                'timeZone' => $payload['timezone'] ?? config('services.microsoft.default_timezone'),
            ],
            'attendees' => collect($payload['attendee_list'] ?? $payload['attendees'] ?? [])->map(function ($attendee) {
                if (is_string($attendee)) {
                    return [
                        'emailAddress' => [
                            'address' => $attendee,
                            'name' => $payload['attendee_name'] ?? $attendee,
                        ],
                        'type' => 'required',
                    ];
                }

                return [
                    'emailAddress' => [
                        'address' => $attendee['email'],
                        'name' => $attendee['name'] ?? $attendee['email'],
                    ],
                    'type' => 'required',
                ];
            })->values()->all(),
            'isOnlineMeeting' => $payload['is_online_meeting'] ?? true,
            'onlineMeetingProvider' => 'teamsForBusiness',
        ];

        if (!($payload['is_online_meeting'] ?? true)) {
            unset($body['isOnlineMeeting'], $body['onlineMeetingProvider']);
        }

        $response = $this->graphRequest('POST', $this->getCalendarUserPath() . '/events', $body);

        if ($response->failed()) {
            throw new MicrosoftGraphException(
                $this->accessDeniedMessage('create Outlook calendar events'),
                MicrosoftGraphException::clientStatus($response->status()),
                $response->json()
            );
        }

        return $response->json();
    }

    private function accessDeniedMessage(string $action): string
    {
        $graphError = 'Failed to ' . $action . '.';

        if ($this->isOAuthConnected()) {
            return $graphError . ' Ensure delegated permissions Calendars.ReadWrite and OnlineMeetings.ReadWrite have admin consent in Azure.';
        }

        return $graphError . ' ' . $this->azureAdminConsentMessage();
    }

    public function updateCalendarEvent(string $eventId, array $payload): array
    {
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
                'timeZone' => $payload['timezone'] ?? config('services.microsoft.default_timezone'),
            ];
        }
        if (isset($payload['end_time'])) {
            $body['end'] = [
                'dateTime' => $payload['end_time'],
                'timeZone' => $payload['timezone'] ?? config('services.microsoft.default_timezone'),
            ];
        }

        $response = $this->graphRequest('PATCH', $this->getCalendarUserPath() . "/events/{$eventId}", $body);

        if ($response->failed()) {
            throw new MicrosoftGraphException(
                'Failed to update Outlook calendar event.',
                MicrosoftGraphException::clientStatus($response->status()),
                $response->json()
            );
        }

        return $response->json();
    }

    public function deleteCalendarEvent(string $eventId): void
    {
        $response = $this->graphRequest('DELETE', $this->getCalendarUserPath() . "/events/{$eventId}");

        if ($response->failed() && $response->status() !== 404) {
            throw new MicrosoftGraphException(
                'Failed to delete Outlook calendar event.',
                MicrosoftGraphException::clientStatus($response->status()),
                $response->json()
            );
        }
    }

    private function graphRequest(string $method, string $path, ?array $body = null, array $query = [])
    {
        $url = rtrim(config('services.microsoft.graph_base_url'), '/') . $path;

        $request = MicrosoftHttpClient::client()
            ->withToken($this->getAccessToken())
            ->acceptJson()
            ->timeout(30);

        try {
            return match (strtoupper($method)) {
                'GET' => $request->get($url, $query),
                'POST' => $request->post($url, $body ?? []),
                'PATCH' => $request->patch($url, $body ?? []),
                'DELETE' => $request->delete($url),
                default => throw new MicrosoftGraphException("Unsupported HTTP method: {$method}", 500),
            };
        } catch (ConnectionException $e) {
            throw $this->connectionException($e);
        }
    }

    private function calendarUserEmail(): string
    {
        $connection = AdminMicrosoftConnection::current();

        if ($connection) {
            return $connection->email;
        }

        return $this->adminEmail();
    }

    private function adminEmail(): string
    {
        $email = config('services.microsoft.admin_email');

        if (!$email) {
            throw new MicrosoftGraphException('ADMIN_EMAIL is not configured.', 500);
        }

        return $email;
    }

    private function authorityUrl(): string
    {
        $tenant = config('services.microsoft.tenant_id', 'common');

        return "https://login.microsoftonline.com/{$tenant}/oauth2/v2.0";
    }

    private function connectionException(ConnectionException $e): MicrosoftGraphException
    {
        $message = $e->getMessage();

        if (str_contains($message, 'SSL certificate') || str_contains($message, 'cURL error 60')) {
            return new MicrosoftGraphException(
                'Microsoft API SSL verification failed. Set CURL_CA_BUNDLE to a valid CA file, '
                . 'place cacert.pem in storage/certs/, or set MICROSOFT_HTTP_VERIFY_SSL=false for local Windows only.',
                502
            );
        }

        return new MicrosoftGraphException('Unable to reach Microsoft Graph API: ' . $message, 502);
    }
}
