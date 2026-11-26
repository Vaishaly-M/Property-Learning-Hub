<?php

namespace App\Services\Chat;

use App\Events\Chat\GroupUpdated;
use App\Models\Chat;
use App\Models\ChatGroupSetting;
use App\Models\ChatMember;
use App\Models\ChatMessage;
use App\Models\User;
use App\Notifications\GroupInvitationNotification;
use App\Support\SafeBroadcast;
use App\Support\MediaStorage;
use App\Support\MediaUrl;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ChatService
{
    public function __construct(
        private ChatActivityLogService $activityLog,
    ) {}

    public function listChatsForUser(User $user)
    {
        return Chat::with([
            'members.user:id,first_name,last_name,email',
            'messages' => fn ($q) => $q->latest()->limit(1)->with('sender:id,first_name,last_name'),
        ])
            ->whereHas('members', fn ($q) => $q->where('user_id', $user->id))
            ->where('status', 'active')
            ->orderByDesc('last_message_at')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (Chat $chat) => $this->transformChatListItem($chat, $user));
    }

    public function listContactsForUser(User $user, ?string $search = null): array
    {
        $privateChats = Chat::with([
            'members',
            'messages' => fn ($q) => $q->latest()->limit(1),
        ])
            ->where('type', 'private')
            ->where('status', 'active')
            ->whereHas('members', fn ($q) => $q->where('user_id', $user->id))
            ->get();

        $chatInfoByUserId = [];
        foreach ($privateChats as $chat) {
            $otherMember = $chat->members->first(fn ($m) => $m->user_id !== $user->id);
            if (!$otherMember) {
                continue;
            }

            $lastMessage = $chat->messages->first();
            $unreadCount = ChatMessage::where('chat_id', $chat->id)
                ->where('sender_id', '!=', $user->id)
                ->whereDoesntHave('reads', fn ($q) => $q->where('user_id', $user->id))
                ->count();

            $chatInfoByUserId[$otherMember->user_id] = [
                'chat_id'         => $chat->id,
                'last_message'    => $lastMessage?->message,
                'last_message_at' => $lastMessage?->created_at ?? $chat->last_message_at,
                'unread_count'    => $unreadCount,
            ];
        }

        $chatParticipantIds = array_keys($chatInfoByUserId);

        $query = User::query()
            ->where('id', '!=', $user->id)
            ->where(function ($q) use ($chatParticipantIds) {
                $q->whereIn('status', ['active', 'pending']);

                if (!empty($chatParticipantIds)) {
                    $q->orWhereIn('id', $chatParticipantIds);
                }
            })
            ->select('id', 'first_name', 'last_name', 'email', 'role', 'status');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
            });
        }

        $users = $query->orderBy('first_name')->orderBy('last_name')->get();

        return $users->map(function ($contact) use ($chatInfoByUserId) {
            $info = $chatInfoByUserId[$contact->id] ?? null;

            return [
                'id'              => $contact->id,
                'name'            => trim("{$contact->first_name} {$contact->last_name}"),
                'email'           => $contact->email,
                'role'            => $contact->role,
                'account_status'  => $contact->status,
                'chat_id'         => $info['chat_id'] ?? null,
                'last_message'    => $info['last_message'] ?? null,
                'last_message_at' => $info['last_message_at'] ?? null,
                'unread_count'    => $info['unread_count'] ?? 0,
            ];
        })
            ->sortByDesc(fn (array $contact) => $contact['last_message_at'] ?? '')
            ->values()
            ->all();
    }

    public function findChatForUser(int $chatId, User $user): Chat
    {
        $chat = Chat::with([
            'members.user:id,first_name,last_name,email,role',
            'groupSettings',
            'creator:id,first_name,last_name,email',
        ])->find($chatId);

        if (!$chat || !$chat->hasMember($user->id)) {
            abort(404, 'Chat not found.');
        }

        return $chat;
    }

    public function createPrivateChat(User $creator, int $recipientId): Chat
    {
        if (!$creator->can('chat.view')) {
            abort(403, 'You do not have permission to start chats.');
        }

        if ($creator->id === $recipientId) {
            abort(422, 'You cannot start a chat with yourself.');
        }

        $existing = Chat::where('type', 'private')
            ->whereHas('members', fn ($q) => $q->where('user_id', $creator->id))
            ->whereHas('members', fn ($q) => $q->where('user_id', $recipientId))
            ->first();

        if ($existing) {
            return $existing->load('members.user:id,first_name,last_name,email');
        }

        return DB::transaction(function () use ($creator, $recipientId) {
            $recipient = User::findOrFail($recipientId);

            $chat = Chat::create([
                'type'       => 'private',
                'created_by' => $creator->id,
                'status'     => 'active',
            ]);

            ChatMember::create(['chat_id' => $chat->id, 'user_id' => $creator->id, 'role' => 'member']);
            ChatMember::create(['chat_id' => $chat->id, 'user_id' => $recipient->id, 'role' => 'member']);

            $this->activityLog->logWithMetadata($creator, 'chat.private_created', [
                'chat_id'      => $chat->id,
                'recipient_id' => $recipientId,
            ]);

            return $chat->load('members.user:id,first_name,last_name,email');
        });
    }

    public function createGroup(User $creator, array $data, ?UploadedFile $avatar = null, ?string $avatarPath = null): Chat
    {
        if (!$creator->can('group_chat.create')) {
            abort(403, 'You do not have permission to create groups.');
        }

        return DB::transaction(function () use ($creator, $data, $avatar, $avatarPath) {
            if ($avatarPath) {
                $storedAvatarPath = $avatarPath;
            } elseif ($avatar) {
                $storedAvatarPath = $this->storeAvatar($avatar);
            } else {
                $storedAvatarPath = null;
            }

            $chat = Chat::create([
                'type'        => 'group',
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'avatar_path' => $storedAvatarPath,
                'created_by'  => $creator->id,
                'status'      => 'active',
            ]);

            ChatGroupSetting::create([
                'chat_id'             => $chat->id,
                'allow_file_share'    => $data['allow_file_share'] ?? true,
                'allow_audio_share'   => $data['allow_audio_share'] ?? true,
                'allow_member_invite' => $data['allow_member_invite'] ?? true,
                'allow_member_remove' => $data['allow_member_remove'] ?? true,
                'updated_by'          => $creator->id,
            ]);

            $memberIds = array_unique(array_merge([$creator->id], $data['member_ids'] ?? []));

            foreach ($memberIds as $memberId) {
                ChatMember::create([
                    'chat_id' => $chat->id,
                    'user_id' => $memberId,
                    'role'    => $memberId === $creator->id ? 'owner' : 'member',
                ]);
            }

            ChatMessage::create([
                'chat_id'      => $chat->id,
                'sender_id'    => $creator->id,
                'message_type' => 'system',
                'message'      => "{$creator->first_name} created the group.",
            ]);

            $this->activityLog->logWithMetadata($creator, 'chat.group_created', [
                'chat_id' => $chat->id,
                'name'    => $chat->name,
            ]);

            $this->notifyGroupInvites($chat, $creator, array_diff($memberIds, [$creator->id]));

            return $chat->load(['members.user:id,first_name,last_name,email', 'groupSettings']);
        });
    }

    public function updateGroup(Chat $chat, User $user, array $data, ?UploadedFile $avatar = null, ?string $avatarPath = null): Chat
    {
        if (!$chat->isGroup() || !$user->can('group_chat.edit')) {
            abort(403, 'You cannot edit this group.');
        }

        $this->assertGroupAdmin($chat, $user);

        $updates = array_filter([
            'name'        => $data['name'] ?? null,
            'description' => $data['description'] ?? null,
        ], fn ($v) => $v !== null);

        if ($avatarPath) {
            if ($chat->avatar_path) {
                MediaStorage::delete($chat->avatar_path);
            }
            $updates['avatar_path'] = $avatarPath;
        } elseif ($avatar) {
            if ($chat->avatar_path) {
                MediaStorage::delete($chat->avatar_path);
            }
            $updates['avatar_path'] = $this->storeAvatar($avatar);
        }

        $chat->update($updates);

        if (isset($data['settings']) && is_array($data['settings'])) {
            $chat->groupSettings?->update(array_merge($data['settings'], ['updated_by' => $user->id]));
        }

        $this->activityLog->logWithMetadata($user, 'chat.group_updated', ['chat_id' => $chat->id]);
        SafeBroadcast::toOthers(new GroupUpdated($chat->fresh(['members.user', 'groupSettings'])));

        return $chat->fresh(['members.user:id,first_name,last_name,email', 'groupSettings']);
    }

    public function addMember(Chat $chat, User $actor, int $userId): ChatMember
    {
        if (!$chat->isGroup() || !$actor->can('group_chat.add_member')) {
            abort(403, 'You cannot add members to this group.');
        }

        $settings = $chat->groupSettings;
        if ($settings && !$settings->allow_member_invite) {
            abort(403, 'Member invites are disabled for this group.');
        }

        if (!$this->isGroupAdmin($chat, $actor) && !$actor->can('group_chat.add_member')) {
            abort(403, 'Only group admins can add members.');
        }

        if ($chat->hasMember($userId)) {
            abort(422, 'User is already a member.');
        }

        $member = ChatMember::create([
            'chat_id' => $chat->id,
            'user_id' => $userId,
            'role'    => 'member',
        ]);

        $invited = User::find($userId);
        ChatMessage::create([
            'chat_id'      => $chat->id,
            'sender_id'    => $actor->id,
            'message_type' => 'system',
            'message'      => "{$actor->first_name} added {$invited?->first_name} to the group.",
        ]);

        $this->activityLog->logWithMetadata($actor, 'chat.member_added', [
            'chat_id' => $chat->id,
            'user_id' => $userId,
        ]);

        if ($invited) {
            $invited->notify(new GroupInvitationNotification($chat, $actor));
        }

        SafeBroadcast::toOthers(new GroupUpdated($chat->fresh(['members.user', 'groupSettings'])));

        return $member->load('user:id,first_name,last_name,email');
    }

    public function removeMember(Chat $chat, User $actor, int $userId): void
    {
        if (!$chat->isGroup() || !$actor->can('group_chat.remove_member')) {
            abort(403, 'You cannot remove members from this group.');
        }

        $settings = $chat->groupSettings;
        if ($settings && !$settings->allow_member_remove) {
            abort(403, 'Member removal is disabled for this group.');
        }

        $this->assertGroupAdmin($chat, $actor);

        $member = ChatMember::where('chat_id', $chat->id)->where('user_id', $userId)->firstOrFail();

        if ($member->isOwner()) {
            abort(422, 'Cannot remove the group owner.');
        }

        $removed = User::find($userId);
        $member->delete();

        ChatMessage::create([
            'chat_id'      => $chat->id,
            'sender_id'    => $actor->id,
            'message_type' => 'system',
            'message'      => "{$actor->first_name} removed {$removed?->first_name} from the group.",
        ]);

        $this->activityLog->logWithMetadata($actor, 'chat.member_removed', [
            'chat_id' => $chat->id,
            'user_id' => $userId,
        ]);

        SafeBroadcast::toOthers(new GroupUpdated($chat->fresh(['members.user', 'groupSettings'])));
    }

    public function deleteGroup(Chat $chat, User $user): void
    {
        if (!$chat->isGroup() || !$user->can('group_chat.delete')) {
            abort(403, 'You cannot delete this group.');
        }

        $this->assertGroupAdmin($chat, $user);
        $chat->update(['status' => 'archived']);

        $this->activityLog->logWithMetadata($user, 'chat.group_deleted', ['chat_id' => $chat->id]);
    }

    private function transformChatListItem(Chat $chat, User $user): array
    {
        $lastMessage = $chat->messages->first();
        $otherMember = $chat->isPrivate()
            ? $chat->members->first(fn ($m) => $m->user_id !== $user->id)?->user
            : null;

        $unreadCount = ChatMessage::where('chat_id', $chat->id)
            ->where('sender_id', '!=', $user->id)
            ->whereDoesntHave('reads', fn ($q) => $q->where('user_id', $user->id))
            ->count();

        return [
            'id'                => $chat->id,
            'type'              => $chat->type,
            'name'              => $chat->isGroup() ? $chat->name : $this->userDisplayName($otherMember),
            'description'       => $chat->description,
            'avatar_url'        => $chat->avatar_path ? MediaUrl::url($chat->avatar_path) : null,
            'last_message'      => $lastMessage?->message,
            'last_message_at'   => $lastMessage?->created_at ?? $chat->last_message_at,
            'unread_count'      => $unreadCount,
            'members'           => $chat->members->map(fn ($m) => [
                'id'         => $m->user_id,
                'name'       => $this->userDisplayName($m->user),
                'role'       => $m->role,
            ]),
        ];
    }

    private function userDisplayName(?User $user): ?string
    {
        return $user ? trim("{$user->first_name} {$user->last_name}") : null;
    }

    private function storeAvatar(UploadedFile $file): string
    {
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        return MediaStorage::storeAs('chat/avatars', $filename, $file);
    }

    private function isGroupAdmin(Chat $chat, User $user): bool
    {
        return ChatMember::where('chat_id', $chat->id)
            ->where('user_id', $user->id)
            ->whereIn('role', ['owner', 'admin'])
            ->exists();
    }

    private function assertGroupAdmin(Chat $chat, User $user): void
    {
        if (!$this->isGroupAdmin($chat, $user)) {
            abort(403, 'Only group admins can perform this action.');
        }
    }

    private function notifyGroupInvites(Chat $chat, User $inviter, array $memberIds): void
    {
        $users = User::whereIn('id', $memberIds)->get();
        foreach ($users as $user) {
            if ($user->can('chat.notification.view')) {
                $user->notify(new GroupInvitationNotification($chat, $inviter));
            }
        }
    }
}
