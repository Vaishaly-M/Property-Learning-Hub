<?php

namespace App\Notifications;

use App\Models\Chat;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class GroupInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Chat $chat,
        public User $inviter,
    ) {}

    public function via(object $notifiable): array
    {
        return app()->environment('local')
            ? ['database']
            : ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title'   => 'Group invitation',
            'message' => "{$this->inviter->first_name} added you to {$this->chat->name}",
            'type'    => 'group_invitation',
            'link'    => "/chat/{$this->chat->id}",
            'chat_id' => $this->chat->id,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
