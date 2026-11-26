//services/chatService.ts

import api from './api';

export interface ChatContact {
  id: number;
  name: string;
  email: string;
  role: string;
  account_status?: string;
  chat_id: number | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
}

export interface ChatListItem {
  id: number;
  type: 'private' | 'group';
  name: string | null;
  description?: string | null;
  avatar_url?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
  members: { id: number; name: string; role: string }[];
}

export interface ChatMessage {
  id: number;
  chat_id: number;
  sender_id: number;
  message_type: 'text' | 'image' | 'file' | 'audio' | 'system';
  message: string | null;
  attachment_url?: string | null;
  audio_url?: string | null;
  _full_audio_url?: string; 
  reply_to_message_id?: number | null;
  edited_at?: string | null;
  deleted_at?: string | null;
  created_at: string;
  sender?: { id: number; first_name: string; last_name: string; email: string };
  reads?: { user_id: number; read_at: string; user?: { id: number; first_name: string; last_name: string } }[];
  deliveries?: { user_id: number; delivered_at: string }[];
  attachments?: {
    id: number;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
  }[];
  reply_to?: ChatMessage;
}

export interface ChatDetail {
  id: number;
  type: 'private' | 'group';
  name: string | null;
  description?: string | null;
  avatar_url?: string | null;
  status: string;
  members: { id: number; name: string; email: string; role: string }[];
  settings?: {
    allow_file_share: boolean;
    allow_audio_share: boolean;
    allow_member_invite: boolean;
    allow_member_remove: boolean;
  };
}

export interface PaginatedMessages {
  data: ChatMessage[];
  current_page: number;
  last_page: number;
  total: number;
}

type ApiEnvelope<T> = { success?: boolean; data: T; message?: string };

function unwrap<T>(response: ApiEnvelope<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiEnvelope<T>).data;
  }
  return response as T;
}

const chatService = {
  getChats: async (): Promise<ChatListItem[]> => {
    const res = await api.get('/chats');
    const data = unwrap<ChatListItem[]>(res);
    return Array.isArray(data) ? data : [];
  },

  getContacts: async (search?: string): Promise<ChatContact[]> => {
    const res = await api.get('/chats/contacts', { params: search ? { search } : {} });
    const data = unwrap<ChatContact[]>(res);
    return Array.isArray(data) ? data : [];
  },

  getChat: async (id: number): Promise<ChatDetail> => {
    const res = await api.get(`/chats/${id}`);
    return unwrap<ChatDetail>(res);
  },

  createPrivateChat: async (recipientId: number) => {
    const res = await api.post('/chats', { type: 'private', recipient_id: recipientId });
    return unwrap(res);
  },

  createGroup: async (formData: FormData) => {
    const res = await api.post('/chats', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(res);
  },

  updateGroup: async (id: number, data: FormData | Record<string, unknown>) => {
    if (data instanceof FormData) {
      const res = await api.post(`/chats/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: { _method: 'PUT' },
      });
      return unwrap(res);
    }
    const res = await api.put(`/chats/${id}`, data);
    return unwrap(res);
  },

  deleteGroup: (id: number) => api.delete(`/chats/${id}`),

  getMessages: async (chatId: number, page = 1): Promise<PaginatedMessages> => {
    const res = await api.get(`/chats/${chatId}/messages`, { params: { page, per_page: 50 } });
    return unwrap<PaginatedMessages>(res);
  },

getFullAttachmentUrl: (path: string): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || '';

  // Already a fully-formed relative media URL (e.g. from MediaUrl::streamPath())
  // like "media/inline?path=..." or "api/media/authenticated?path=..." — don't re-wrap.
  if (/^\/?(api\/)?media\/(inline|authenticated)\b/.test(path)) {
    let clean = path.startsWith('/') ? path.substring(1) : path;
    if (!clean.startsWith('api/')) clean = `api/${clean}`;
    return `${baseUrl}/${clean}`;
  }

  let cleanPath = path;
  if (cleanPath.startsWith('/api/')) cleanPath = cleanPath.substring(4);
  if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);

  return `${baseUrl}/api/media/authenticated?path=${encodeURIComponent(cleanPath)}`;
},

  sendMessage: async (chatId: number, payload: FormData | Record<string, unknown>) => {
    if (payload instanceof FormData) {
      const res = await api.post(`/chats/${chatId}/messages`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return unwrap<ChatMessage>(res);
    }
    const res = await api.post(`/chats/${chatId}/messages`, payload);
    return unwrap<ChatMessage>(res);
  },

  editMessage: async (messageId: number, message: string) => {
    const res = await api.put(`/messages/${messageId}`, { message });
    return unwrap<ChatMessage>(res);
  },

  deleteMessage: (messageId: number) => api.delete(`/messages/${messageId}`),

  markRead: (messageId: number) => api.post(`/messages/${messageId}/read`),

  sendTyping: (chatId: number) => api.post(`/chats/${chatId}/typing`),

  addMember: async (groupId: number, userId: number) => {
    const res = await api.post(`/groups/${groupId}/members`, { user_id: userId });
    return unwrap(res);
  },

  removeMember: (groupId: number, userId: number) =>
    api.delete(`/groups/${groupId}/members/${userId}`),

  getNotifications: async () => {
    const res = await api.get('/chat/notifications');
    const data = unwrap(res);
    return Array.isArray(data) ? data : [];
  },

  ggetAttachmentUrl: (attachmentId: number) =>
  `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '')}/api/chat/attachments/${attachmentId}/download`,
};

export default chatService;
