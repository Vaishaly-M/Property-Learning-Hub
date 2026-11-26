<?php

namespace App\Console\Commands;

use App\Models\Communication;
use App\Services\Crm\CrmCommunicationService;
use App\Services\Crm\LearnerAnnouncementService;
use Illuminate\Console\Command;

class SendScheduledCommunications extends Command
{
    protected $signature = 'crm:send-scheduled-communications';

    protected $description = 'Send CRM communications that are scheduled for now or earlier';

    public function handle(
        CrmCommunicationService $service,
        LearnerAnnouncementService $learnerAnnouncements,
    ): int {
        $communications = Communication::where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->get();

        $total = 0;

        foreach ($communications as $communication) {
            $contactIds = $communication->recipients()->pluck('contact_id')->toArray();

            if (empty($contactIds)) {
                $contactIds = $service->resolveAudience(
                    $communication->audience_filter,
                    $communication->filter_params ?? []
                );
                $service->attachRecipients($communication, $contactIds);
            }

            $sent = $service->send($communication, $contactIds);
            $learnerCount = $learnerAnnouncements->publish($communication->fresh());
            $total += $sent;
            $this->info("Sent communication #{$communication->id} to {$sent} contacts"
                . ($learnerCount > 0 ? " and {$learnerCount} learners" : ''));
        }

        $this->info("Processed {$communications->count()} scheduled communications ({$total} emails sent).");

        return self::SUCCESS;
    }
}
