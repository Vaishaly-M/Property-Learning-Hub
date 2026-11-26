<?php

namespace App\Console\Commands;

use App\Services\Crm\WebinarAutomationService;
use Illuminate\Console\Command;

class SendWebinarReminders extends Command
{
    protected $signature = 'crm:send-webinar-reminders';

    protected $description = 'Send reminder emails for upcoming webinar registrations';

    public function handle(WebinarAutomationService $service): int
    {
        $count = $service->sendReminders();
        $this->info("Sent {$count} webinar reminder emails.");

        return self::SUCCESS;
    }
}
