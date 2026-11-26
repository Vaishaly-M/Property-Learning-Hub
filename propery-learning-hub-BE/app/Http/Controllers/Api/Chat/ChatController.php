<?php

namespace App\Http\Controllers\Api\Chat;

use App\Http\Controllers\Controller;
use App\Models\ChatAttachment;
use App\Models\ChatMessage;
use App\Services\Chat\ChatMessageService;
use App\Services\Chat\ChatService;
use App\Traits\ApiResponses;
use App\Support\DirectUpload;
use App\Support\MediaUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    use ApiResponses;

    public function __construct(
        private ChatService $chatService,
        private ChatMessageService $messageService,
    ) {}

    public function index(Request $request)
    {
        try {
            if (!$request->user()->can('chat.view') && !$request->user()->can('group_chat.view')) {
                return $this->forbidden();
            }

            return $this->success($this->chatService->listChatsForUser($request->user()));
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    public function contacts(Request $request)
    {
        try {
            if (!$request->user()->can('chat.view')) {
                return $this->forbidden();
            }

            return $this->success(
                $this->chatService->listContactsForUser($request->user(), $request->get('search'))
            );
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'type'         => 'required|in:private,group',
                'recipient_id' => 'required_if:type,private|exists:users,id',
                'name'         => 'required_if:type,group|string|max:255',
                'description'  => 'nullable|string',
                'member_ids'   => 'nullable|array',
                'member_ids.*' => 'exists:users,id',
                'avatar'       => 'nullable|image|max:5120',
                'avatar_path'  => 'nullable|string|max:500',
            ]);
            

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            if ($request->type === 'private') {
                $chat = $this->chatService->createPrivateChat(
                    $request->user(),
                    (int) $request->recipient_id
                );
            } else {
                $avatarPath = null;
                if ($request->filled('avatar_path')) {
                    $resolved = DirectUpload::resolvePath($request, 'avatar_path');
                    if ($resolved instanceof \Illuminate\Http\JsonResponse) {
                        return $resolved;
                    }
                    $avatarPath = $resolved;
                }

                $chat = $this->chatService->createGroup(
                    $request->user(),
                    $request->only(['name', 'description', 'member_ids']),
                    $request->file('avatar'),
                    $avatarPath,
                );
            }

            return $this->success($chat, 'Chat created successfully.', 201);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    public function show(Request $request, int $id)
    {
        try {
            $chat = $this->chatService->findChatForUser($id, $request->user());

            return $this->success([
                'id'          => $chat->id,
                'type'        => $chat->type,
                'name'        => $chat->name,
                'description' => $chat->description,
                'avatar_url'  => $chat->avatar_path
                    ? MediaUrl::url($chat->avatar_path)
                    : null,
                'status'      => $chat->status,
                'members'     => $chat->members->map(fn ($m) => [
                    'id'    => $m->user_id,
                    'name'  => trim("{$m->user->first_name} {$m->user->last_name}"),
                    'email' => $m->user->email,
                    'role'  => $m->role,
                ]),
                'settings'    => $chat->groupSettings,
            ]);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    public function update(Request $request, int $id)
    {
        try {
            $chat = $this->chatService->findChatForUser($id, $request->user());

            $validator = Validator::make($request->all(), [
                'name'        => 'sometimes|string|max:255',
                'description' => 'nullable|string',
                'avatar'      => 'nullable|image|max:5120',
                'avatar_path' => 'nullable|string|max:500',
                'settings'    => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $avatarPath = null;
            if ($request->filled('avatar_path')) {
                $resolved = DirectUpload::resolvePath($request, 'avatar_path');
                if ($resolved instanceof \Illuminate\Http\JsonResponse) {
                    return $resolved;
                }
                $avatarPath = $resolved;
            }

            $updated = $this->chatService->updateGroup(
                $chat,
                $request->user(),
                array_merge(
                    $request->only(['name', 'description']),
                    ['settings' => $this->parseSettings($request->input('settings'))]
                ),
                $request->file('avatar'),
                $avatarPath,
            );

            return $this->success($updated, 'Group updated successfully.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    public function destroy(Request $request, int $id)
    {
        try {
            $chat = $this->chatService->findChatForUser($id, $request->user());
            $this->chatService->deleteGroup($chat, $request->user());

            return $this->success(null, 'Group archived successfully.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    public function messages(Request $request, int $id)
    {
        try {
            $chat = $this->chatService->findChatForUser($id, $request->user());
            $messages = $this->messageService->listMessages(
                $chat,
                $request->user(),
                (int) $request->get('per_page', 50)
            );

            return $this->success($messages);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    public function sendMessage(Request $request, int $id)
    {
        try {
            $chat = $this->chatService->findChatForUser($id, $request->user());

            $validator = Validator::make($request->all(), [
                'message'             => 'nullable|string|max:10000',
                'message_type'        => 'nullable|in:text,image,file,audio',
                'reply_to_message_id' => 'nullable|exists:chat_messages,id',
                'file'                => 'nullable|file|max:20480',
                'file_path'           => 'nullable|string|max:500',
                'file_name'           => 'nullable|string|max:255',
                'file_size'           => 'nullable|integer|min:1',
                'mime_type'           => 'nullable|string|max:127',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $directFile = null;
            if ($request->filled('file_path')) {
                $resolved = DirectUpload::resolveFileMeta($request);
                if ($resolved instanceof \Illuminate\Http\JsonResponse) {
                    return $resolved;
                }
                $directFile = $resolved;
            }

            $message = $this->messageService->sendMessage(
                $chat,
                $request->user(),
                $request->only(['message', 'message_type', 'reply_to_message_id']),
                $request->file('file'),
                $directFile,
            );

            // Ensure audio_url is set for audio messages
             if ($message->message_type === 'audio') {
            // Get the attachment
            $attachment = $message->attachments()->first();
            if ($attachment) {
                $fullUrl = MediaUrl::url($attachment->file_path);
                $message->audio_url = $fullUrl;
                $message->attachment_url = $fullUrl;
                $message->save();
            } else if ($message->attachment_url) {
                // If attachment_url is already set, use it for audio_url
                $message->audio_url = $message->attachment_url;
                $message->save();
            }
        }
            // Load relationships for response
            $message->load(['sender', 'attachments']);

              return $this->success($message, 'Message sent.', 201);
    } catch (\Throwable $e) {
        return $this->serverError($e);
    }
    }

    public function typing(Request $request, int $id)
    {
        try {
            $chat = $this->chatService->findChatForUser($id, $request->user());
            $this->messageService->broadcastTyping($chat, $request->user());

            return $this->success(null, 'Typing broadcast sent.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    public function addMember(Request $request, int $id)
    {
        try {
            $chat = $this->chatService->findChatForUser($id, $request->user());

            $validator = Validator::make($request->all(), [
                'user_id' => 'required|exists:users,id',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $member = $this->chatService->addMember($chat, $request->user(), (int) $request->user_id);

            return $this->success($member, 'Member added.', 201);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    public function removeMember(Request $request, int $groupId, int $userId)
    {
        try {
            $chat = $this->chatService->findChatForUser($groupId, $request->user());
            $this->chatService->removeMember($chat, $request->user(), $userId);

            return $this->success(null, 'Member removed.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    public function markMessageRead(Request $request, int $messageId)
    {
        try {
            $message = ChatMessage::with('chat')->findOrFail($messageId);
            $this->messageService->markRead($message, $request->user());

            return $this->success(null, 'Message marked as read.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    public function updateMessage(Request $request, int $messageId)
    {
        try {
            $message = ChatMessage::findOrFail($messageId);
            $validator = Validator::make($request->all(), [
                'message' => 'required|string|max:10000',
            ]);

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $updated = $this->messageService->updateMessage($message, $request->user(), $request->message);

            return $this->success($updated, 'Message updated.');
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

   public function deleteMessage(Request $request, int $messageId)
{
    try {
        $message = ChatMessage::findOrFail($messageId);
        $this->messageService->deleteMessage($message, $request->user());

        return $this->success(null, 'Message deleted.');
    } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
        return $this->error($e->getMessage(), $e->getStatusCode());
    } catch (\Throwable $e) {
        return $this->serverError($e);
    }
}

    public function downloadAttachment(Request $request, int $attachmentId)
    {
        try {
            $attachment = ChatAttachment::findOrFail($attachmentId);
            return $this->messageService->downloadAttachment($attachment, $request->user());
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return $this->error($e->getMessage(), $e->getStatusCode());
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    public function notifications(Request $request)
    {
        try {
            if (!$request->user()->can('chat.notification.view')) {
                return $this->forbidden();
            }

            $notifications = $request->user()
                ->notifications()
                ->latest()
                ->limit(50)
                ->get()
                ->map(fn ($n) => [
                    'id'         => $n->id,
                    'data'       => $n->data,
                    'read_at'    => $n->read_at,
                    'created_at' => $n->created_at,
                ]);

            return $this->success($notifications);
        } catch (\Throwable $e) {
            return $this->serverError($e);
        }
    }

    private function parseSettings(mixed $settings): ?array
    {
        if (is_array($settings)) {
            return $settings;
        }

        if (is_string($settings)) {
            $decoded = json_decode($settings, true);
            return is_array($decoded) ? $decoded : null;
        }

        return null;
    }
}