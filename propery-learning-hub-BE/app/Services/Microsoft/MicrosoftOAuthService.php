<?php

namespace App\Services\Microsoft;

use App\Exceptions\MicrosoftGraphException;
use App\Models\MicrosoftAccount;
use App\Repositories\MicrosoftAccountRepository;
use App\Support\MicrosoftHttpClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class MicrosoftOAuthService
{
    public function __construct(
        private readonly MicrosoftAccountRepository $accounts,
    ) {}

    public function getAuthorizationUrl(int $userId): string
    {
        $state = Crypt::encryptString(json_encode([
            'user_id' => $userId,
            'nonce' => Str::random(40),
            'ts' => now()->timestamp,
        ]));

        Cache::put("microsoft_oauth_state:{$userId}", $state, now()->addMinutes(15));

        $params = http_build_query([
            'client_id' => config('services.microsoft.client_id'),
            'response_type' => 'code',
            'redirect_uri' => config('services.microsoft.redirect_uri'),
            'response_mode' => 'query',
            'scope' => implode(' ', config('services.microsoft.scopes')),
            'state' => $state,
            'prompt' => 'consent',
        ]);

        return $this->authorityUrl() . '/authorize?' . $params;
    }

    public function handleCallback(string $code, string $state): MicrosoftAccount
    {
        $payload = json_decode(Crypt::decryptString($state), true);
        $userId = (int) ($payload['user_id'] ?? 0);

        if (!$userId) {
            throw new MicrosoftGraphException('Invalid OAuth state.', 400);
        }

        $cached = Cache::get("microsoft_oauth_state:{$userId}");
        if (!$cached || !hash_equals($cached, $state)) {
            throw new MicrosoftGraphException('OAuth state mismatch or expired.', 400);
        }

        Cache::forget("microsoft_oauth_state:{$userId}");

        $tokenData = $this->exchangeCodeForTokens($code);

        $graph = new MicrosoftGraphService($this->accounts);
        $profile = $graph->getUserProfileWithToken($tokenData['access_token']);

        $user = \App\Models\User::findOrFail($userId);

        return $this->accounts->upsertForUser($user, [
            'microsoft_user_id' => $profile['id'],
            'email' => $profile['mail'] ?? $profile['userPrincipalName'],
            'display_name' => $profile['displayName'] ?? null,
            'access_token' => $tokenData['access_token'],
            'refresh_token' => $tokenData['refresh_token'],
            'expires_at' => now()->addSeconds((int) ($tokenData['expires_in'] ?? 3600)),
        ]);
    }

    public function exchangeCodeForTokens(string $code): array
    {
        $response = MicrosoftHttpClient::client()->asForm()->post($this->authorityUrl() . '/token', [
            'client_id' => config('services.microsoft.client_id'),
            'client_secret' => config('services.microsoft.client_secret'),
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => config('services.microsoft.redirect_uri'),
            'scope' => implode(' ', config('services.microsoft.scopes')),
        ]);

        if ($response->failed()) {
            throw new MicrosoftGraphException(
                'Failed to exchange authorization code.',
                $response->status(),
                $response->json()
            );
        }

        return $response->json();
    }

    private function authorityUrl(): string
    {
        $tenant = config('services.microsoft.tenant_id', 'common');

        return "https://login.microsoftonline.com/{$tenant}/oauth2/v2.0";
    }
}
