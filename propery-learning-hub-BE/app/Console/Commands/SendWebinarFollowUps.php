<?php

namespace App\Console\Commands;

use App\Services\Crm\WebinarAutomationService;
use Illuminate\Console\Command;

class SendWebinarFollowUps extends Command
{
    protected $signature = 'crm:send-webinar-follow-ups';

    protected $description = 'Send follow-up emails after completed webinars';

    public function handle(WebinarAutomationService $service): int
    {
        $count = $service->sendFollowUps();
        $this->info("Sent {$count} webinar follow-up emails.");

        return self::SUCCESS;
    }
}
