<?php

namespace App\Services\Microsoft;

use App\Models\AdminMicrosoftConnection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use App\Exceptions\MicrosoftGraphException;
use App\Support\MicrosoftHttpClient;

class AdminMicrosoftOAuthService
{
    private const STATE_CACHE_PREFIX = 'admin_ms_oauth_state:';

    public function getAuthorizationUrl(): string
    {
        $state = Crypt::encryptString(json_encode([
            'purpose' => 'admin_calendar',
            'nonce' => Str::random(40),
            'ts' => now()->timestamp,
        ]));

        Cache::put(self::STATE_CACHE_PREFIX . 'pending', $state, now()->addMinutes(15));

        $params = http_build_query([
            'client_id' => config('services.microsoft.client_id'),
            'response_type' => 'code',
            'redirect_uri' => config('services.microsoft.redirect_uri'),
            'response_mode' => 'query',
            'scope' => implode(' ', config('services.microsoft.delegated_scopes')),
            'state' => $state,
            'prompt' => 'consent',
            'login_hint' => config('services.microsoft.admin_email'),
        ]);

        return $this->authorityUrl() . '/authorize?' . $params;
    }

    public function handleCallback(string $code, string $state): AdminMicrosoftConnection
    {
        $cached = Cache::get(self::STATE_CACHE_PREFIX . 'pending');

        if (!$cached || !hash_equals($cached, $state)) {
            throw new MicrosoftGraphException('OAuth state mismatch or expired.', 400);
        }

        Cache::forget(self::STATE_CACHE_PREFIX . 'pending');

        $tokenData = $this->exchangeCode($code);

        $profile = $this->fetchProfile($tokenData['access_token']);

        AdminMicrosoftConnection::query()->delete();

        return AdminMicrosoftConnection::create([
            'microsoft_user_id' => $profile['id'] ?? null,
            'email' => $profile['mail'] ?? $profile['userPrincipalName'],
            'display_name' => $profile['displayName'] ?? null,
            'access_token' => $tokenData['access_token'],
            'refresh_token' => $tokenData['refresh_token'],
            'expires_at' => now()->addSeconds((int) ($tokenData['expires_in'] ?? 3600)),
        ]);
    }

    public function refreshConnection(AdminMicrosoftConnection $connection): AdminMicrosoftConnection
    {
        $response = MicrosoftHttpClient::client()->asForm()->post($this->authorityUrl() . '/token', [
            'client_id' => config('services.microsoft.client_id'),
            'client_secret' => config('services.microsoft.client_secret'),
            'grant_type' => 'refresh_token',
            'refresh_token' => $connection->refresh_token,
            'scope' => implode(' ', config('services.microsoft.delegated_scopes')),
        ]);

        if ($response->failed()) {
            throw new MicrosoftGraphException(
                'Failed to refresh admin Microsoft token. Please reconnect.',
                $response->status(),
                $response->json()
            );
        }

        $data = $response->json();
        $connection->access_token = $data['access_token'];
        if (!empty($data['refresh_token'])) {
            $connection->refresh_token = $data['refresh_token'];
        }
        $connection->expires_at = now()->addSeconds((int) ($data['expires_in'] ?? 3600));
        $connection->save();

        return $connection->fresh();
    }

    public function disconnect(): void
    {
        AdminMicrosoftConnection::query()->delete();
        Cache::forget(AdminMicrosoftGraphService::TOKEN_CACHE_KEY);
    }

    private function exchangeCode(string $code): array
    {
        $response = MicrosoftHttpClient::client()->asForm()->post($this->authorityUrl() . '/token', [
            'client_id' => config('services.microsoft.client_id'),
            'client_secret' => config('services.microsoft.client_secret'),
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => config('services.microsoft.redirect_uri'),
            'scope' => implode(' ', config('services.microsoft.delegated_scopes')),
        ]);

        if ($response->failed()) {
            throw new MicrosoftGraphException('Failed to exchange authorization code.', $response->status(), $response->json());
        }

        return $response->json();
    }

    private function fetchProfile(string $accessToken): array
    {
        $url = rtrim(config('services.microsoft.graph_base_url'), '/') . '/me';
        $response = MicrosoftHttpClient::client()->withToken($accessToken)->acceptJson()->get($url);

        if ($response->failed()) {
            throw new MicrosoftGraphException('Failed to fetch Microsoft profile.', $response->status(), $response->json());
        }

        return $response->json();
    }

    private function authorityUrl(): string
    {
        return 'https://login.microsoftonline.com/' . config('services.microsoft.tenant_id', 'common') . '/oauth2/v2.0';
    }
}
