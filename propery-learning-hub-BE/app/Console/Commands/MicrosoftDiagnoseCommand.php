<?php

namespace App\Console\Commands;

use App\Models\AdminMicrosoftConnection;
use App\Services\Microsoft\AdminMicrosoftGraphService;
use App\Support\MicrosoftHttpClient;
use Illuminate\Console\Command;

class MicrosoftDiagnoseCommand extends Command
{
    protected $signature = 'microsoft:diagnose';

    protected $description = 'Check Microsoft Graph token type, permissions, and admin mailbox access';

    public function handle(AdminMicrosoftGraphService $graph): int
    {
        $connection = AdminMicrosoftConnection::current();
        $adminEmail = config('services.microsoft.admin_email');

        $this->info('Admin email: ' . ($adminEmail ?: '(not set)'));
        $this->info('OAuth connected: ' . ($connection ? 'yes (' . $connection->email . ')' : 'no'));

        if ($connection) {
            $this->info('API path: /me (delegated token)');
        } else {
            $this->warn('API path: /users/' . $adminEmail . ' (client-credentials — requires Application permissions + admin consent)');
        }

        try {
            $token = $graph->getAccessToken();
        } catch (\Throwable $e) {
            $this->error('Token error: ' . $e->getMessage());

            return self::FAILURE;
        }

        $parts = explode('.', $token);
        $payload = json_decode(base64_decode(strtr($parts[1] ?? '', '-_', '+/')), true) ?: [];
        $roles = $payload['roles'] ?? [];
        $scopes = $payload['scp'] ?? $payload['scope'] ?? null;

        $this->line('Application roles in token: ' . (empty($roles) ? '(none)' : implode(', ', $roles)));
        $this->line('Delegated scopes in token: ' . ($scopes ?: '(none)'));

        if (!$connection && empty($roles)) {
            $this->newLine();
            $this->warn('No application permissions in token.');
            $this->line('  Azure Portal → App registrations → API permissions → Application:');
            $this->line('    Calendars.ReadWrite, OnlineMeetings.ReadWrite.All, User.Read.All');
            $this->line('  Then click: Grant admin consent for your tenant');
            $this->line('  (.env keys identify the app; admin consent grants calendar access)');
        }

        $path = $connection ? '/me' : '/users/' . $adminEmail;
        $url = rtrim(config('services.microsoft.graph_base_url'), '/') . $path;
        $response = MicrosoftHttpClient::client()->withToken($token)->get($url);

        $this->newLine();
        $this->info("GET {$path} → HTTP {$response->status()}");

        if ($response->failed()) {
            $this->error($response->body());

            return self::FAILURE;
        }

        $this->info('Microsoft Graph access looks OK.');

        return self::SUCCESS;
    }
}
