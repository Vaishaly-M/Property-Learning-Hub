<?php

namespace App\Events\Chat;

use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageDelivered implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public ChatMessage $message, public User $user) {}

    public function broadcastOn(): array
    {
        return [new Channel('chat.' . $this->message->chat_id)];
    }

    public function broadcastAs(): string
    {
        return 'message.delivered';
    }

    public function broadcastWith(): array
    {
        return [
            'chat_id'    => $this->message->chat_id,
            'message_id' => $this->message->id,
            'user_id'    => $this->user->id,
            'delivered_at' => now()->toIso8601String(),
        ];
    }
}
