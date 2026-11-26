<?php

namespace App\Services;

use App\Support\MicrosoftHttpClient;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class InfinitWizardSsoService
{
    /**
     * Create/activate an InfinitWizard account for a portal user (learner or admin)
     * and return a dashboard redirect URL that auto-logs them in (token in query string).
     *
     * @param  array{email: string, first_name?: string, last_name?: string, phone_number?: string|null}  $learner
     * @return array{redirect_url: string, access_token: string, email: string, created: bool}
     */
    public function launch(array $learner): array
    {
        $baseUrl = rtrim((string) config('services.infinitwizard.api_url', ''), '/');
        $apiKey = (string) config('services.infinitwizard.api_key', '');

        if ($baseUrl === '' || $apiKey === '') {
            throw new RuntimeException(
                'InfinitWizard is not configured. Set INFINITWIZARD_API_URL and INFINITWIZARD_APP_API_KEY.'
            );
        }

        $email = strtolower(trim((string) ($learner['email'] ?? '')));
        if ($email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new RuntimeException('Your account does not have a valid email address.');
        }

        // Reuse the same SSL resolve path as Microsoft/Clarity (Windows local often
        // needs MICROSOFT_HTTP_VERIFY_SSL=false or a CA bundle).
        $response = Http::withOptions([
            'verify' => MicrosoftHttpClient::resolveVerify(),
        ])
            ->timeout(30)
            ->acceptJson()
            ->withHeaders([
                'api-key' => $apiKey,
                'Accept' => 'application/json',
            ])
            ->post($baseUrl.'/api/v1/auth/education-sso', [
                'email' => $email,
                'first_name' => $learner['first_name'] ?? null,
                'last_name' => $learner['last_name'] ?? null,
                'phone_number' => $learner['phone_number'] ?? null,
            ]);

        if (! $response->successful()) {
            Log::warning('InfinitWizard education SSO failed', [
                'email' => $email,
                'status' => $response->status(),
                'body' => $response->json() ?? $response->body(),
            ]);

            if ($response->status() === 404) {
                throw new RuntimeException(
                    'InfinitWizard education SSO is not available on the configured API. Deploy the education-sso endpoint or point INFINITWIZARD_API_URL at an IW backend that has it.'
                );
            }

            if ($response->status() === 401 || $response->status() === 403) {
                throw new RuntimeException(
                    'InfinitWizard rejected the API key. Confirm INFINITWIZARD_APP_API_KEY matches IW APP_API_KEY.'
                );
            }

            $message = data_get($response->json(), 'message')
                ?: 'Unable to open InfinitWizard. Please try again.';

            throw new RuntimeException($message);
        }

        $data = $response->json('data') ?? [];
        $redirectUrl = (string) ($data['redirect_url'] ?? '');
        $accessToken = (string) ($data['access_token'] ?? '');

        // Fallback: token is embedded in verified redirect URL when access_token is omitted.
        if ($accessToken === '' && $redirectUrl !== '') {
            $query = parse_url($redirectUrl, PHP_URL_QUERY);
            if (is_string($query) && $query !== '') {
                parse_str($query, $params);
                $accessToken = (string) ($params['token'] ?? '');
            }
        }

        if ($redirectUrl === '') {
            throw new RuntimeException('InfinitWizard did not return a login URL.');
        }

        if ($accessToken === '') {
            throw new RuntimeException('InfinitWizard did not return an access token.');
        }

        return [
            'redirect_url' => $redirectUrl,
            'access_token' => $accessToken,
            'email' => (string) ($data['email'] ?? $email),
            'created' => (bool) ($data['created'] ?? false),
        ];
    }
}
