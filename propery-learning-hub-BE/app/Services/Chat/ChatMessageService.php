<?php

namespace App\Services\Chat;

use App\Events\Chat\MessageDelivered;
use App\Events\Chat\MessageRead;
use App\Events\Chat\MessageSent;
use App\Events\Chat\UserTyping;
use App\Models\Chat;
use App\Models\ChatAttachment;
use App\Models\ChatMessage;
use App\Models\ChatMessageDelivery;
use App\Models\ChatMessageRead;
use App\Models\User;
use App\Notifications\ChatMessageNotification;
use App\Support\SafeBroadcast;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use App\Support\DirectUpload;
use App\Support\MediaStorage;
use App\Support\MediaUrl;
use Illuminate\Support\Str;

class ChatMessageService
{
    public function __construct(
        private ChatActivityLogService $activityLog,
    ) {}

    private const FILE_MIMES = [
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip',
        'png', 'jpg', 'jpeg',
    ];

    private const AUDIO_MIMES = ['mp3', 'wav', 'm4a', 'ogg'];

    public function listMessages(Chat $chat, User $user, int $perPage = 50)
    {
        $this->assertMember($chat, $user);

        return ChatMessage::with([
            'sender:id,first_name,last_name,email',
            'replyTo.sender:id,first_name,last_name',
            'attachments',
            'reads.user:id,first_name,last_name',
            'deliveries.user:id,first_name,last_name',
        ])
            ->where('chat_id', $chat->id)
            ->latest()
            ->paginate($perPage);
    }

    public function sendMessage(Chat $chat, User $sender, array $data, ?UploadedFile $file = null, ?array $directFile = null): ChatMessage
    {
        $this->assertMember($chat, $sender);
        $this->assertCanSend($chat, $sender, $data, $file, $directFile);

        $message = DB::transaction(function () use ($chat, $sender, $data, $file, $directFile) {
            $messageType = $data['message_type'] ?? 'text';
            $attachmentUrl = null;
            $audioUrl = null;

            if ($directFile) {
                $stored = [
                    'path' => $directFile['path'],
                    'url'  => MediaUrl::url($directFile['path']),
                ];
            } elseif ($file) {
                $stored = $this->storeFile($chat, $file, $messageType);
            } else {
                $stored = null;
            }

            if ($stored) {
                if ($messageType === 'audio') {
                    $audioUrl = $stored['url'];
                } else {
                    $attachmentUrl = $stored['url'];
                }
            }

            $message = ChatMessage::create([
                'chat_id'             => $chat->id,
                'sender_id'           => $sender->id,
                'message_type'        => $messageType,
                'message'             => $data['message'] ?? null,
                'attachment_url'      => $attachmentUrl,
                'audio_url'           => $audioUrl,
                'reply_to_message_id' => $data['reply_to_message_id'] ?? null,
            ]);

            if ($stored) {
                ChatAttachment::create([
                    'message_id'  => $message->id,
                    'file_name'   => $directFile['name'] ?? $file->getClientOriginalName(),
                    'file_path'   => $stored['path'],
                    'file_size'   => $directFile['size'] ?? $file->getSize(),
                    'mime_type'   => $directFile['mime'] ?? $file->getMimeType(),
                    'uploaded_by' => $sender->id,
                    'created_at'  => now(),
                ]);
            }

            $chat->update(['last_message_at' => now()]);

            $this->recordDeliveries($message, $chat, $sender);
            $this->activityLog->logWithMetadata($sender, 'chat.message_sent', [
                'chat_id'    => $chat->id,
                'message_id' => $message->id,
                'type'       => $messageType,
            ]);

            $message->load(['sender:id,first_name,last_name,email', 'attachments', 'replyTo']);

            return $message;
        });

        try {
            SafeBroadcast::toOthers(new MessageSent($message));
            $this->notifyMembers($chat, $sender, $message);
        } catch (\Throwable $e) {
            report($e);
        }

        return $message;
    }

    public function updateMessage(ChatMessage $message, User $user, string $text): ChatMessage
    {
        if ($message->sender_id !== $user->id) {
            abort(403, 'You can only edit your own messages.');
        }

        $message->update([
            'message'   => $text,
            'edited_at' => now(),
        ]);

        $this->activityLog->logWithMetadata($user, 'chat.message_edited', [
            'message_id' => $message->id,
            'chat_id'    => $message->chat_id,
        ]);

        return $message->fresh(['sender:id,first_name,last_name,email']);
    }

    public function deleteMessage(ChatMessage $message, User $user): void
    {
        if ($message->sender_id !== $user->id && !$user->can('chat.delete')) {
            abort(403, 'You cannot delete this message.');
        }

        $message->delete();

        $this->activityLog->logWithMetadata($user, 'chat.message_deleted', [
            'message_id' => $message->id,
            'chat_id'    => $message->chat_id,
        ]);
    }

    public function markRead(ChatMessage $message, User $user): void
    {
        $this->assertMember($message->chat, $user);

        ChatMessageRead::updateOrCreate(
            ['message_id' => $message->id, 'user_id' => $user->id],
            ['read_at' => now()]
        );

        SafeBroadcast::toOthers(new MessageRead($message, $user));
    }

    public function markDelivered(ChatMessage $message, User $user): void
    {
        $this->assertMember($message->chat, $user);

        if ($message->sender_id === $user->id) {
            return;
        }

        ChatMessageDelivery::updateOrCreate(
            ['message_id' => $message->id, 'user_id' => $user->id],
            ['delivered_at' => now()]
        );

        SafeBroadcast::toOthers(new MessageDelivered($message, $user));
    }

    public function broadcastTyping(Chat $chat, User $user): void
    {
        $this->assertMember($chat, $user);
        SafeBroadcast::toOthers(new UserTyping($chat, $user));
    }

    public function downloadAttachment(ChatAttachment $attachment, User $user)
    {
        $message = $attachment->message()->with('chat.members')->firstOrFail();
        $this->assertMember($message->chat, $user);

        if (!$user->can('chat.file.download')) {
            abort(403, 'You do not have permission to download files.');
        }

        if (!MediaStorage::exists($attachment->file_path)) {
            abort(404, 'File not found.');
        }

        return MediaStorage::download($attachment->file_path, $attachment->file_name);
    }

    private function assertMember(Chat $chat, User $user): void
    {
        if (!$chat->hasMember($user->id)) {
            abort(403, 'You are not a member of this chat.');
        }
    }

    private function assertCanSend(Chat $chat, User $user, array $data, ?UploadedFile $file, ?array $directFile = null): void
    {
        $type = $data['message_type'] ?? 'text';

        if ($chat->isPrivate() && !$user->can('chat.send')) {
            abort(403, 'You do not have permission to send messages.');
        }

        if ($chat->isGroup() && !$user->can('group_chat.send')) {
            abort(403, 'You do not have permission to send group messages.');
        }

        if (in_array($type, ['file', 'image'], true) && !$user->can('chat.file.upload')) {
            abort(403, 'You do not have permission to upload files.');
        }

        if ($type === 'audio' && !$user->can('chat.audio.send')) {
            abort(403, 'You do not have permission to send audio.');
        }

        if ($file) {
            $ext = strtolower($file->getClientOriginalExtension());
            if ($type === 'audio' && !in_array($ext, self::AUDIO_MIMES, true)) {
                abort(422, 'Unsupported audio format.');
            }
            if (in_array($type, ['file', 'image'], true) && !in_array($ext, self::FILE_MIMES, true)) {
                abort(422, 'Unsupported file format.');
            }
        } elseif ($directFile) {
            $ext = strtolower(pathinfo($directFile['name'], PATHINFO_EXTENSION));
            if ($type === 'audio' && !in_array($ext, self::AUDIO_MIMES, true)) {
                abort(422, 'Unsupported audio format.');
            }
            if (in_array($type, ['file', 'image'], true) && !in_array($ext, self::FILE_MIMES, true)) {
                abort(422, 'Unsupported file format.');
            }
        }

        if ($chat->isGroup()) {
            $settings = $chat->groupSettings;
            if ($settings) {
                if (in_array($type, ['file', 'image'], true) && !$settings->allow_file_share) {
                    abort(403, 'File sharing is disabled in this group.');
                }
                if ($type === 'audio' && !$settings->allow_audio_share) {
                    abort(403, 'Audio sharing is disabled in this group.');
                }
            }
        }
    }

    private function storeFile(Chat $chat, UploadedFile $file, string $messageType): array
    {
        $folder = "chat/{$chat->id}";
        $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
        $path = MediaStorage::storeAs($folder, $filename, $file);

        return [
            'path' => $path,
            'url'  => MediaUrl::url($path),
        ];
    }

    private function recordDeliveries(ChatMessage $message, Chat $chat, User $sender): void
    {
        $memberIds = $chat->members()->where('user_id', '!=', $sender->id)->pluck('user_id');

        foreach ($memberIds as $memberId) {
            ChatMessageDelivery::create([
                'message_id'   => $message->id,
                'user_id'      => $memberId,
                'delivered_at' => now(),
            ]);
        }
    }

    private function notifyMembers(Chat $chat, User $sender, ChatMessage $message): void
    {
        $recipients = User::whereIn(
            'id',
            $chat->members()->where('user_id', '!=', $sender->id)->pluck('user_id')
        )->get();

        foreach ($recipients as $recipient) {
            if ($recipient->can('chat.notification.view')) {
                $recipient->notify(new ChatMessageNotification($chat, $message, $sender));
            }
        }
    }
}
