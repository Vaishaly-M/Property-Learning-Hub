//hooks/usePusherChat.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Pusher, { Channel, PresenceChannel } from 'pusher-js';
import chatService, { ChatMessage } from '../services/chatService';

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '';
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER || 'mt1';
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'http://127.0.0.1:8000';

type MessageSentPayload = ChatMessage & {
  message_id?: number;
  timestamp?: string;
};

export function usePusherChat(
  chatId: number | null,
  currentUserId: number | undefined,
  onNewMessage?: (message: ChatMessage) => void,
) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const presenceRef = useRef<PresenceChannel | null>(null);
  const typingTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!chatId || !currentUserId || !PUSHER_KEY) return;

    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('token') || localStorage.getItem('auth_token')
        : null;

    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      authEndpoint: `${API_BASE}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      },
    });

    pusherRef.current = pusher;

    const channel = pusher.subscribe(`chat.${chatId}`);
    channelRef.current = channel;

    channel.bind('message.sent', (data: MessageSentPayload) => {
      const senderId = data.sender?.id || (data as { sender_id?: number }).sender_id;
      // Skip own messages — already added from the API response
      if (senderId && senderId === currentUserId) return;

      onNewMessage?.({
        ...data,
        id: data.message_id || data.id,
        chat_id: chatId,
        sender_id: senderId || 0,
        created_at: data.timestamp || data.created_at || new Date().toISOString(),
        message_type: data.message_type || 'text',
      } as ChatMessage);
    });

    channel.bind('message.read', () => {
      // Parent can refetch or update read state
    });

    const presence = pusher.subscribe(`presence-chat-presence.${chatId}`) as PresenceChannel;
    presenceRef.current = presence;

    presence.bind('user.typing', (data: { user_id: number; user_name: string }) => {
      if (data.user_id === currentUserId) return;

      setTypingUsers((prev) =>
        prev.includes(data.user_name) ? prev : [...prev, data.user_name],
      );

      if (typingTimeoutRef.current[data.user_id]) {
        clearTimeout(typingTimeoutRef.current[data.user_id]);
      }

      typingTimeoutRef.current[data.user_id] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((n) => n !== data.user_name));
      }, 3000);
    });

    return () => {
      channel.unbind_all();
      presence.unbind_all();
      pusher.unsubscribe(`chat.${chatId}`);
      pusher.unsubscribe(`presence-chat-presence.${chatId}`);
      pusher.disconnect();
    };
  }, [chatId, currentUserId, onNewMessage]);

  const notifyTyping = useCallback(() => {
    if (chatId) {
      chatService.sendTyping(chatId).catch(() => {});
    }
  }, [chatId]);

  return { typingUsers, notifyTyping };
}
