<?php

namespace App\Events\Chat;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public ChatMessage $message)
    {
        $this->message->loadMissing('sender:id,first_name,last_name,email');
    }

    public function broadcastOn(): array
    {
        return [new Channel('chat.' . $this->message->chat_id)];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    public function broadcastWith(): array
    {
        return [
            'chat_id'    => $this->message->chat_id,
            'message_id' => $this->message->id,
            'sender'     => [
                'id'   => $this->message->sender->id,
                'name' => trim("{$this->message->sender->first_name} {$this->message->sender->last_name}"),
            ],
            'message'    => $this->message->message,
            'message_type' => $this->message->message_type,
            'attachment_url' => $this->message->attachment_url,
            'audio_url'  => $this->message->audio_url,
            'timestamp'  => $this->message->created_at?->toIso8601String(),
        ];
    }
}
