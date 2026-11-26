<?php

use App\Models\Chat;
use App\Models\ChatMember;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('chat.{chatId}', function ($user, int $chatId) {
    return ChatMember::where('chat_id', $chatId)->where('user_id', $user->id)->exists();
});

Broadcast::channel('chat-presence.{chatId}', function ($user, int $chatId) {
    if (!ChatMember::where('chat_id', $chatId)->where('user_id', $user->id)->exists()) {
        return false;
    }

    return [
        'id'   => $user->id,
        'name' => trim("{$user->first_name} {$user->last_name}"),
    ];
});

Broadcast::channel('App.Models.User.{id}', function ($user, int $id) {
    return (int) $user->id === $id;
});
