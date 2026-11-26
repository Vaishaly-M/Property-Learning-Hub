<?php

namespace App\Events\Chat;

use App\Models\Chat;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Support\MediaUrl;

class GroupUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Chat $chat) {}

    public function broadcastOn(): array
    {
        return [new Channel('chat.' . $this->chat->id)];
    }

    public function broadcastAs(): string
    {
        return 'group.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'chat_id'     => $this->chat->id,
            'name'        => $this->chat->name,
            'description' => $this->chat->description,
            'avatar_url'  => $this->chat->avatar_path
                ? MediaUrl::url($this->chat->avatar_path)
                : null,
            'members'     => $this->chat->members?->map(fn ($m) => [
                'id'   => $m->user_id,
                'role' => $m->role,
            ]),
        ];
    }
}
