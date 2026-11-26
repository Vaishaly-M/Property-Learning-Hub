<?php

namespace App\Services\Chat;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;

class ChatActivityLogService
{
    public function log(User $actor, string $action, string $details, ?User $subject = null): void
    {
        ActivityLog::create([
            'user_id'           => $subject?->id ?? $actor->id,
            'action'            => $action,
            'details'           => $details,
            'performed_by'      => $actor->id,
            'performed_by_name' => trim("{$actor->first_name} {$actor->last_name}"),
            'ip_address'        => request()->ip(),
            'user_agent'        => request()->userAgent(),
        ]);
    }

    public function logWithMetadata(User $actor, string $action, array $metadata, ?User $subject = null): void
    {
        $this->log($actor, $action, json_encode($metadata), $subject);
    }
}
