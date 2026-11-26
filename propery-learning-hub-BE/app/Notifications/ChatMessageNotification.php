<?php

namespace App\Notifications;

use App\Models\Chat;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class ChatMessageNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Chat $chat,
        public ChatMessage $message,
        public User $sender,
    ) {}

    public function via(object $notifiable): array
    {
        return app()->environment('local')
            ? ['database']
            : ['database', 'broadcast'];
    }

    public function toArray(object $notifiable): array
    {
        $chatName = $this->chat->isGroup()
            ? $this->chat->name
            : trim("{$this->sender->first_name} {$this->sender->last_name}");

        return [
            'title'   => "New message from {$chatName}",
            'message' => $this->message->message ?? 'Sent an attachment',
            'type'    => 'chat',
            'link'    => "/chat/{$this->chat->id}",
            'chat_id' => $this->chat->id,
            'message_id' => $this->message->id,
        ];
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}
