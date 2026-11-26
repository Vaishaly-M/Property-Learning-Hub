<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

class InstallMicrosoftCaBundle extends Command
{
    protected $signature = 'microsoft:install-ca-bundle';

    protected $description = 'Download Mozilla CA bundle for Microsoft Graph SSL verification on Windows';

    public function handle(): int
    {
        $path = storage_path('certs/cacert.pem');

        File::ensureDirectoryExists(dirname($path));

        $this->info('Downloading CA certificate bundle...');

        $response = Http::withoutVerifying()->timeout(60)->get('https://curl.se/ca/cacert.pem');

        if ($response->failed()) {
            $this->error('Failed to download cacert.pem from curl.se');

            return self::FAILURE;
        }

        File::put($path, $response->body());

        $this->info("CA bundle installed: {$path}");
        $this->line('Add to your .env (optional if auto-detected):');
        $this->line("CURL_CA_BUNDLE={$path}");

        return self::SUCCESS;
    }
}
