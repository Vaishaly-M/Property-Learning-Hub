<?php

namespace App\Services\Zoom;

use App\Exceptions\ZoomApiException;
use App\Support\MicrosoftHttpClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;

class ZoomApiService
{
    private const TOKEN_CACHE_KEY = 'zoom_s2s_access_token';

    public function isConfigured(): bool
    {
        return (bool) (
            config('services.zoom.account_id')
            && config('services.zoom.client_id')
            && config('services.zoom.client_secret')
        );
    }

    public function assertConfigured(): void
    {
        if (!$this->isConfigured()) {
            throw new ZoomApiException(
                'Zoom is not configured. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET in .env.',
                503,
            );
        }
    }

    public function getAccessToken(): string
    {
        $this->assertConfigured();

        $cached = Cache::get(self::TOKEN_CACHE_KEY);

        if (is_array($cached) && !empty($cached['token']) && ($cached['expires_at'] ?? 0) > time() + 60) {
            return $cached['token'];
        }

        $clientId = config('services.zoom.client_id');
        $clientSecret = config('services.zoom.client_secret');

        try {
            $response = $this->http()
                ->asForm()
                ->withBasicAuth($clientId, $clientSecret)
                ->post(config('services.zoom.auth_url'), [
                    'grant_type' => 'account_credentials',
                    'account_id' => config('services.zoom.account_id'),
                ]);
        } catch (ConnectionException $e) {
            throw $this->connectionException($e);
        }

        if ($response->failed()) {
            throw new ZoomApiException(
                'Failed to obtain Zoom access token.',
                $response->status(),
                $response->json(),
            );
        }

        $data = $response->json();
        $token = $data['access_token'] ?? null;

        if (!$token) {
            throw new ZoomApiException('Zoom access token missing from response.', 502, $data);
        }

        $expiresIn = (int) ($data['expires_in'] ?? 3600);

        Cache::put(self::TOKEN_CACHE_KEY, [
            'token' => $token,
            'expires_at' => time() + $expiresIn,
        ], max(60, $expiresIn - 120));

        return $token;
    }

    /**
     * @return array{id: string|int, join_url?: string, start_url?: string}
     */
    public function createMeeting(array $payload): array
    {
        $userId = config('services.zoom.user_id', 'me');

        return $this->request('POST', "/users/{$userId}/meetings", $payload);
    }

    /**
     * @return array<string, mixed>
     */
    public function updateMeeting(string $meetingId, array $payload): array
    {
        return $this->request('PATCH', "/meetings/{$meetingId}", $payload);
    }

    public function deleteMeeting(string $meetingId): void
    {
        $this->request('DELETE', "/meetings/{$meetingId}");
    }

    // -----------------------------------------------------------------------
    // Zoom Webinar methods
    // -----------------------------------------------------------------------

    /**
     * Create a Zoom Webinar for the authenticated user.
     *
     * @return array{id: string|int, join_url?: string, start_url?: string, uuid?: string, password?: string, registration_url?: string}
     *
     * @throws ZoomApiException
     */
    public function createWebinar(array $payload): array
    {
        $userId = config('services.zoom.user_id', 'me');

        return $this->request('POST', "/users/{$userId}/webinars", $payload);
    }

    /**
     * Update an existing Zoom Webinar.
     *
     * @return array<string, mixed>
     *
     * @throws ZoomApiException
     */
    public function updateWebinar(string $webinarId, array $payload): array
    {
        return $this->request('PATCH', "/webinars/{$webinarId}", $payload);
    }

    /**
     * Delete a Zoom Webinar.
     *
     * @throws ZoomApiException
     */
    public function deleteWebinar(string $webinarId): void
    {
        $this->request('DELETE', "/webinars/{$webinarId}");
    }

    /**
     * Create a Zoom Webinar when licensed, otherwise fall back to a scheduled meeting
     * or a manually supplied link.
     *
     * @return array<string, mixed>
     *
     * @throws ZoomApiException
     */
    public function provisionWebinarOrMeeting(array $webinarPayload, ?string $manualLink = null): array
    {
        if (!$this->isConfigured()) {
            if ($manualLink) {
                return [
                    'join_url' => $manualLink,
                    'start_url' => $manualLink,
                    'source' => 'manual',
                ];
            }

            throw new ZoomApiException(
                'Zoom is not configured on this server. Please define ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET in the .env file.',
                422,
            );
        }

        if ($this->hasWebinarLicense()) {
            return array_merge($this->createWebinar($webinarPayload), ['source' => 'webinar']);
        }

        if (config('services.zoom.fallback_to_meeting', true)) {
            $meetingPayload = [
                'topic' => $webinarPayload['topic'],
                'type' => 2,
                'start_time' => $webinarPayload['start_time'],
                'duration' => $webinarPayload['duration'],
                'timezone' => $webinarPayload['timezone'],
                'agenda' => $webinarPayload['agenda'] ?? '',
                'settings' => [
                    'host_video' => true,
                    'participant_video' => true,
                    'join_before_host' => false,
                    'waiting_room' => true,
                    'auto_recording' => 'cloud',
                ],
            ];

            return array_merge($this->createMeeting($meetingPayload), ['source' => 'meeting']);
        }

        if ($manualLink) {
            return [
                'join_url' => $manualLink,
                'start_url' => $manualLink,
                'source' => 'manual',
            ];
        }

        throw new ZoomApiException(
            'The connected Zoom account does not have a Webinar license enabled. Enable Webinar in Zoom or provide a manual meeting link.',
            422,
        );
    }

    /**
     * Check whether the connected Zoom account has a Webinar licence.
     * Calls GET /users/me and inspects the `feature` object.
     */
    public function hasWebinarLicense(): bool
    {
        try {
            $user = $this->request('GET', '/users/me');

            return (bool) (
                ($user['feature']['webinar'] ?? false)
                || ($user['feature']['webinar_capacity'] ?? 0) > 0
            );
        } catch (ZoomApiException) {
            return false;
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function request(string $method, string $path, ?array $body = null): array
    {
        $url = rtrim(config('services.zoom.base_url'), '/') . $path;

        try {
            $request = $this->http()
                ->withToken($this->getAccessToken())
                ->acceptJson();

            $response = match (strtoupper($method)) {
                'POST'   => $request->post($url, $body ?? []),
                'PATCH'  => $request->patch($url, $body ?? []),
                'DELETE' => $request->delete($url),
                'GET'    => $request->get($url),
                default  => throw new ZoomApiException("Unsupported HTTP method: {$method}", 500),
            };
        } catch (ConnectionException $e) {
            throw $this->connectionException($e);
        }

        if ($response->status() === 204) {
            return [];
        }

        if ($response->failed()) {
            throw new ZoomApiException(
                'Zoom API request failed.',
                $response->status(),
                $response->json(),
            );
        }

        return $response->json() ?? [];
    }

    private function http(): PendingRequest
    {
        return MicrosoftHttpClient::client()->timeout(30);
    }

    private function connectionException(ConnectionException $e): ZoomApiException
    {
        $message = $e->getMessage();

        if (str_contains($message, 'SSL certificate') || str_contains($message, 'cURL error 60')) {
            return new ZoomApiException(
                'Zoom API SSL verification failed. Set CURL_CA_BUNDLE to a valid CA file, '
                . 'place cacert.pem in storage/certs/, or set MICROSOFT_HTTP_VERIFY_SSL=false for local Windows only.',
                502,
            );
        }

        return new ZoomApiException('Unable to reach Zoom API: ' . $message, 502);
    }
}
