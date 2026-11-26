# Internal Chat API

Base URL: `/api`  
Auth: Bearer token (Sanctum)

## Chats

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/chats` | `chat.view` | List user's chats |
| POST | `/chats` | varies | Create private or group chat |
| GET | `/chats/{id}` | `chat.view` | Get chat details |
| PUT | `/chats/{id}` | `group_chat.edit` | Update group |
| DELETE | `/chats/{id}` | `group_chat.delete` | Archive group |

### Create private chat
```json
POST /api/chats
{ "type": "private", "recipient_id": 2 }
```

### Create group
```json
POST /api/chats (multipart)
type=group&name=Team&description=...&member_ids[]=2&member_ids[]=3&avatar=<file>
```

## Messages

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/chats/{id}/messages` | `chat.view` |
| POST | `/chats/{id}/messages` | `chat.send` |
| PUT | `/messages/{id}` | `chat.send` |
| DELETE | `/messages/{id}` | `chat.delete` |
| POST | `/messages/{id}/read` | `chat.receive` |
| POST | `/chats/{id}/typing` | `chat.send` |

### Send message
```json
POST /api/chats/1/messages
{ "message": "Hello", "message_type": "text", "reply_to_message_id": null }
```

File/audio: multipart with `file` field.

## Group members

| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/groups/{id}/members` | `group_chat.add_member` |
| DELETE | `/groups/{groupId}/members/{userId}` | `group_chat.remove_member` |

## Attachments & notifications

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/chat/attachments/{id}/download` | `chat.file.download` |
| GET | `/chat/notifications` | `chat.notification.view` |

## Pusher events

Channel: `chat.{chat_id}`  
Presence: `chat-presence.{chat_id}`

| Event | Payload |
|-------|---------|
| `message.sent` | chat_id, message_id, sender, message, timestamp |
| `message.delivered` | chat_id, message_id, user_id, delivered_at |
| `message.read` | chat_id, message_id, user_id, read_at |
| `user.typing` | user_id, user_name, chat_id |
| `group.updated` | chat_id, name, members |

## Permissions

Individual: `chat.view`, `chat.send`, `chat.receive`, `chat.delete`  
Group: `group_chat.*`  
Files: `chat.file.upload`, `chat.file.download`  
Audio: `chat.audio.send`, `chat.audio.receive`  
Notifications: `chat.notification.view`
