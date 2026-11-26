<?php

namespace App\Events\Chat;

use App\Models\Chat;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserTyping implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Chat $chat, public User $user) {}

    public function broadcastOn(): array
    {
        return [new PresenceChannel('chat-presence.' . $this->chat->id)];
    }

    public function broadcastAs(): string
    {
        return 'user.typing';
    }

    public function broadcastWith(): array
    {
        return [
            'user_id'   => $this->user->id,
            'user_name' => trim("{$this->user->first_name} {$this->user->last_name}"),
            'chat_id'   => $this->chat->id,
        ];
    }
}
