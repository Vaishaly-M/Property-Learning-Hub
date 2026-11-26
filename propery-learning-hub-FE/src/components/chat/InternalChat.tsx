'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Add,
  AttachFile,
  Chat,
  Delete,
  Edit,
  Group,
  Person,
  Search,
  Send,
  Settings,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { usePusherChat } from '../../hooks/usePusherChat';
import chatService, { ChatContact, ChatListItem, ChatMessage } from '../../services/chatService';
import { appendMediaToFormData, MEDIA_UPLOAD_PRESETS, getPresignedPlaybackUrl } from '../../services/mediaUploadService';
import { usePermissions } from '../../hooks/usePermissions';
import GroupManagementModal from './GroupManagementModal';
import VoiceRecorder from './VoiceRecorder';

function formatTime(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function readStatus(message: ChatMessage, isOwn: boolean, isGroup: boolean) {
  if (!isOwn) return null;
  const delivered = message.deliveries?.length ?? 0;
  const read = message.reads?.length ?? 0;
  if (read > 0) return isGroup ? `Read by ${read}` : '✓✓ Read';
  if (delivered > 0) return '✓✓ Delivered';
  return '✓ Sent';
}

function upsertMessage(prev: ChatMessage[], msg: ChatMessage): ChatMessage[] {
  if (!msg.id) return [...prev, msg];
  const index = prev.findIndex((m) => m.id === msg.id);
  if (index >= 0) {
    const next = [...prev];
    next[index] = { ...next[index], ...msg };
    return next;
  }
  return [...prev, msg];
}

const InternalChat: React.FC = () => {
  const { admin: user, isInitialized } = useAdminAuth();
  const { can } = usePermissions();
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState<'create' | 'edit'>('create');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingDebounce = useRef<NodeJS.Timeout | null>(null);

  const selectedChat = chats.find((c) => c.id === selectedChatId);
  const selectedContact = contacts.find((c) => c.id === selectedUserId);
  const groupChats = chats.filter((c) => c.type === 'group');
  const privateChats = chats.filter((c) => c.type === 'private');

  const [resolvedMediaUrls, setResolvedMediaUrls] = useState<Record<number, string>>({});
  const [mediaErrors, setMediaErrors] = useState<Record<number, boolean>>({});

  // Backend may return either a raw storage path ("chat/12/x.wav") or an
  // already-built query URL ("media/inline?path=chat%2F12%2Fx.wav" or a full URL
  // with a ?path= param). Normalize to the raw storage path either way.
  function extractStoragePath(raw: string): string {
    if (!raw) return '';
    const qIndex = raw.indexOf('path=');
    if (qIndex !== -1) {
      const value = raw.substring(qIndex + 5).split('&')[0];
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
    return raw.replace(/^\/+/, '');
  }

  useEffect(() => {
    const toResolve = messages.filter(
      (m) =>
        (m.message_type === 'audio' || m.message_type === 'file' || m.message_type === 'image') &&
        (m.audio_url || m.attachment_url) &&
        resolvedMediaUrls[m.id] === undefined &&
        !mediaErrors[m.id],
    );
    if (toResolve.length === 0) return;

    toResolve.forEach(async (m) => {
      const raw = m.audio_url || m.attachment_url || '';
      const storagePath = extractStoragePath(raw);
      if (!storagePath) return;
      try {
        const url = await getPresignedPlaybackUrl(storagePath);
        setResolvedMediaUrls((prev) => ({ ...prev, [m.id]: url }));
      } catch (err) {
        console.error('Failed to resolve media URL for message', m.id, err);
        setMediaErrors((prev) => ({ ...prev, [m.id]: true }));
      }
    });
  }, [messages]);

  const handleNewMessage = useCallback(
    (msg: ChatMessage) => {
      if (msg.sender_id === user?.id) return;
      if (msg.chat_id === selectedChatId || !msg.chat_id) {
        setMessages((prev) => upsertMessage(prev, msg));
        if (msg.id && user && msg.sender_id !== user.id) {
          chatService.markRead(msg.id).catch(() => {});
        }
      }
      loadChats();
      loadContacts();
    },
    [selectedChatId, user],
  );

  const { typingUsers, notifyTyping } = usePusherChat(
    selectedChatId,
    user?.id,
    handleNewMessage,
  );

  const loadContacts = async () => {
    try {
      const data = await chatService.getContacts(searchQuery || undefined);
      setContacts(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load contacts');
    }
  };

  const loadChats = async () => {
    try {
      const data = await chatService.getChats();
      setChats(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load chats');
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadChats(), loadContacts()]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const res = await chatService.getMessages(chatId);
      const items = Array.isArray(res?.data) ? res.data : [];
      setMessages([...items].reverse());
      items.forEach((m) => {
        if (m.sender_id !== user?.id) {
          chatService.markRead(m.id).catch(() => {});
        }
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load messages');
    }
  };

  const hasChatAccess = can('chat.view') || can('group_chat.view');

  useEffect(() => {
    if (!isInitialized || !hasChatAccess) {
      if (isInitialized && !hasChatAccess) {
        setLoading(false);
      }
      return;
    }
    loadAll();
  }, [isInitialized, hasChatAccess]);

  useEffect(() => {
    if (!isInitialized || !hasChatAccess || loading) return;

    const pendingChatId = sessionStorage.getItem('learner_open_chat_id');
    if (!pendingChatId) return;

    const chatId = Number(pendingChatId);
    if (!Number.isFinite(chatId)) {
      sessionStorage.removeItem('learner_open_chat_id');
      return;
    }

    setSelectedChatId(chatId);
    setSelectedUserId(null);
    void loadMessages(chatId);
    sessionStorage.removeItem('learner_open_chat_id');
  }, [isInitialized, hasChatAccess, loading, chats.length]);

  useEffect(() => {
    if (!isInitialized || !hasChatAccess) return;

    const timer = setTimeout(() => {
      loadContacts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isInitialized, hasChatAccess]);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
    }
  }, [selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ensureChatId = async (): Promise<number | null> => {
    if (selectedChatId) return selectedChatId;
    if (!selectedUserId) return null;

    const chat = await chatService.createPrivateChat(selectedUserId);
    const chatId = (chat as { id: number }).id;
    setSelectedChatId(chatId);
    await Promise.all([loadChats(), loadContacts()]);
    return chatId;
  };

  const openContact = (contact: ChatContact) => {
    setSelectedUserId(contact.id);
    if (contact.chat_id) {
      setSelectedChatId(contact.chat_id);
    } else {
      setSelectedChatId(null);
      setMessages([]);
    }
  };

  const openGroup = (chatId: number) => {
    setSelectedUserId(null);
    setSelectedChatId(chatId);
  };

  const handleSend = async () => {
    if ((!selectedChatId && !selectedUserId) || !messageInput.trim()) return;

    setSending(true);
    try {
      const chatId = await ensureChatId();
      if (!chatId) return;

      if (editingMessageId) {
        await chatService.editMessage(editingMessageId, messageInput);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessageId
              ? { ...m, message: messageInput, edited_at: new Date().toISOString() }
              : m,
          ),
        );
        setEditingMessageId(null);
      } else {
        const msg = await chatService.sendMessage(chatId, {
          message: messageInput,
          message_type: 'text',
        });
        setMessages((prev) => upsertMessage(prev, msg));
      }
      setMessageInput('');
      loadChats();
      loadContacts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'file' | 'audio' | 'image') => {
    if (!selectedChatId && !selectedUserId) return;

    try {
      const chatId = await ensureChatId();
      if (!chatId) return;

      const form = new FormData();
      await appendMediaToFormData(form, file, MEDIA_UPLOAD_PRESETS.chatFile(chatId));
      form.append('message_type', type);
      form.append('message', file.name);

      const msg = await chatService.sendMessage(chatId, form);
      setMessages((prev) => upsertMessage(prev, msg));
      loadChats();
      loadContacts();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  const handleVoiceRecordingComplete = async (audioBlob: Blob, duration: number) => {
    try {
      const chatId = await ensureChatId();
      if (!chatId) return;

      // Use WAV format for maximum compatibility
      const audioFile = new File([audioBlob], `voice-message-${Date.now()}.wav`, {
        type: 'audio/wav'
      });

      const form = new FormData();
      await appendMediaToFormData(form, audioFile, MEDIA_UPLOAD_PRESETS.chatFile(chatId));
      form.append('message_type', 'audio');
      form.append('message', `Voice message (${duration}s)`);

      const msg = await chatService.sendMessage(chatId, form);
      
      // Ensure audio_url is properly set from the response
      const audioUrl = msg.audio_url || msg.attachment_url;
      if (audioUrl) {
        const fullUrl = chatService.getFullAttachmentUrl(audioUrl);
        setMessages((prev) => upsertMessage(prev, {
          ...msg,
          audio_url: audioUrl,
          attachment_url: audioUrl,
          _full_audio_url: fullUrl // Store full URL for playback
        }));
      } else {
        setMessages((prev) => upsertMessage(prev, msg));
      }
      
      loadChats();
      loadContacts();
      toast.success('Voice message sent');
      setIsRecordingVoice(false);
    } catch (e) {
      console.error('Voice message error:', e);
      toast.error(e instanceof Error ? e.message : 'Failed to send voice message');
      setIsRecordingVoice(false);
    }
  };

  const handleVoiceRecordingCancel = () => {
    setIsRecordingVoice(false);
  };

  const handleVoiceRecordingStateChange = (recording: boolean) => {
    setIsRecordingVoice(recording);
  };

  const debugAudioUrl = (url: string) => {
    console.log('Audio URL:', url);
    console.log('API Base:', process.env.NEXT_PUBLIC_API_URL);
    try {
      const parsed = new URL(url);
      console.log('Parsed URL:', parsed);
    } catch (e) {
      console.error('Invalid URL:', e);
    }
  };

  const audioRefs = useRef<Record<number, HTMLAudioElement>>({});

const handleAudioPlay = (currentId: number) => {
  Object.entries(audioRefs.current).forEach(([id, audioEl]) => {
    if (Number(id) !== currentId && audioEl && !audioEl.paused) {
      audioEl.pause();
    }
  });
};


  const handleInputChange = (value: string) => {
    setMessageInput(value);
    if (typingDebounce.current) clearTimeout(typingDebounce.current);
    typingDebounce.current = setTimeout(() => notifyTyping(), 400);
  };

  const filteredGroups = groupChats.filter((c) =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredPrivateChats = privateChats.filter((chat) => {
    const matchesSearch =
      (chat.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.members.some((member) =>
        member.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    return matchesSearch;
  });

  const contactConversations = contacts.filter((contact) => {
    if (!contact.chat_id) return false;
    if (privateChats.some((chat) => chat.id === contact.chat_id)) return false;

    return (
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.role.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredContacts = contacts.filter(
    (c) =>
      !c.chat_id &&
      (c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const conversationTitle =
    selectedChat?.name || selectedContact?.name || 'Chat';
  const conversationSubtitle = selectedContact
    ? selectedContact.role.charAt(0).toUpperCase() + selectedContact.role.slice(1)
    : selectedChat?.type === 'group'
      ? `${selectedChat.members.length} members`
      : null;
  const isConversationOpen = selectedChatId !== null || selectedUserId !== null;
  const canSendInCurrentChat =
    selectedChat?.type === 'group' ? can('group_chat.send') : can('chat.send');
  const canUploadFiles = can('chat.file.upload');
  const canSendAudio = can('chat.audio.send');
  const canEditOwnMessage = can('chat.send');
  const canDeleteOwnMessage = can('chat.delete');

  const renderMessageContent = (msg: ChatMessage) => {
    const isAudio = msg.message_type === 'audio';
    const isFileOrImage = (msg.message_type === 'file' || msg.message_type === 'image') && (msg.attachment_url || msg.audio_url);

    if (isAudio) {
      const resolved = resolvedMediaUrls[msg.id];
      const hasError = mediaErrors[msg.id];
      const raw = msg.audio_url || msg.attachment_url;

      if (hasError) {
        return <span className="text-xs opacity-70 text-red-400">Unable to play audio</span>;
      }
      if (!raw) {
        return <span className="text-xs opacity-70">Voice message (processing...)</span>;
      }
      if (!resolved) {
        return <span className="text-xs opacity-70">Loading audio...</span>;
      }
      return (
        <div className="flex items-center gap-2 min-w-[150px]">
         <audio
          ref={(el) => {
            if (el) audioRefs.current[msg.id] = el;
            else delete audioRefs.current[msg.id];
          }}
          controls
          src={resolved}
          className="max-w-[220px] h-10"
          controlsList="nodownload"
          onPlay={() => handleAudioPlay(msg.id)}
          onError={() => setMediaErrors((prev) => ({ ...prev, [msg.id]: true }))}
        />
          <span className="text-xs opacity-70">{msg.message || 'Voice message'}</span>
        </div>
      );
    }

    if (isFileOrImage) {
      const resolved = resolvedMediaUrls[msg.id];
      const hasError = mediaErrors[msg.id];

      if (hasError) {
        return <span className="text-xs opacity-70 text-red-400">Unable to load attachment</span>;
      }
      if (!resolved) {
        return <span className="text-xs opacity-70">Loading attachment...</span>;
      }

      if (msg.message_type === 'image') {
        return (
          <img
            src={resolved}
            alt="attachment"
            className="max-w-xs rounded-lg"
            onError={() => setMediaErrors((prev) => ({ ...prev, [msg.id]: true }))}
          />
        );
      }
      return (
        <a
          href={resolved}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-200 underline flex items-center gap-1"
        >
          <AttachFile fontSize="small" />
          {msg.message || 'Download file'}
        </a>
      );
    }

    return <span>{msg.message}</span>;
  };

  if (!isInitialized || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasChatAccess) {
    return (
      <div className="flex items-center justify-center h-96 text-slate-500">
        You do not have permission to access chat.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Chat list */}
      <div className="w-80 border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Chat className="text-blue-900" />
              Messages
            </h2>
            <button
              onClick={() => {
                setGroupModalMode('create');
                setShowGroupModal(true);
              }}
              className="p-2 rounded-lg bg-blue-900 text-white hover:bg-blue-800 disabled:opacity-50"
              title="New group"
              disabled={!can('group_chat.create')}
            >
              <Add fontSize="small" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" fontSize="small" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredGroups.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Groups
            </p>
          )}
          {filteredGroups.map((chat) => (
            <button
              key={`group-${chat.id}`}
              onClick={() => openGroup(chat.id)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition ${
                selectedChatId === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-900' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center flex-shrink-0">
                  <Group fontSize="small" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-slate-800 truncate">
                      {chat.name || 'Group'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatTime(chat.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {chat.last_message || 'No messages yet'}
                  </p>
                </div>
                {chat.unread_count > 0 && (
                  <span className="bg-blue-900 text-white text-xs rounded-full px-2 py-0.5">
                    {chat.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))}

          {filteredPrivateChats.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Conversations
            </p>
          )}
          {filteredPrivateChats.map((chat) => (
            <button
              key={`private-${chat.id}`}
              onClick={() => openGroup(chat.id)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition ${
                selectedChatId === chat.id ? 'bg-blue-50 border-l-4 border-l-blue-900' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                  {chat.name?.[0] || <Person fontSize="small" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-slate-800 truncate">
                      {chat.name || 'Private chat'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatTime(chat.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {chat.last_message || 'No messages yet'}
                  </p>
                </div>
                {chat.unread_count > 0 && (
                  <span className="bg-blue-900 text-white text-xs rounded-full px-2 py-0.5">
                    {chat.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))}

          {contactConversations.map((contact) => (
            <button
              key={`contact-chat-${contact.id}`}
              onClick={() => openContact(contact)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition ${
                selectedChatId === contact.chat_id ? 'bg-blue-50 border-l-4 border-l-blue-900' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                  {contact.name?.[0] || <Person fontSize="small" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800 truncate">
                      {contact.name}
                    </span>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {formatTime(contact.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {contact.account_status && contact.account_status !== 'active' && (
                      <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {contact.account_status === 'pending' ? 'Activation pending' : contact.account_status}
                      </span>
                    )}
                    <p className="text-xs text-slate-500 truncate">
                      {contact.last_message || 'No messages yet'}
                    </p>
                  </div>
                </div>
                {contact.unread_count > 0 && (
                  <span className="bg-blue-900 text-white text-xs rounded-full px-2 py-0.5">
                    {contact.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))}

          {filteredContacts.length > 0 && (
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
              People
            </p>
          )}
          {filteredContacts.map((contact) => (
            <button
              key={`contact-${contact.id}`}
              onClick={() => openContact(contact)}
              className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition ${
                selectedUserId === contact.id ||
                (contact.chat_id !== null && selectedChatId === contact.chat_id)
                  ? 'bg-blue-50 border-l-4 border-l-blue-900'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                  {contact.name?.[0] || <Person fontSize="small" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800 truncate">
                      {contact.name}
                    </span>
                    <span className="text-xs text-slate-400 flex-shrink-0">
                      {formatTime(contact.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wide text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      {contact.role}
                    </span>
                    {contact.account_status && contact.account_status !== 'active' && (
                      <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {contact.account_status === 'pending' ? 'Activation pending' : contact.account_status}
                      </span>
                    )}
                    <p className="text-xs text-slate-500 truncate">
                      {contact.last_message || 'No conversation yet'}
                    </p>
                  </div>
                </div>
                {contact.unread_count > 0 && (
                  <span className="bg-blue-900 text-white text-xs rounded-full px-2 py-0.5">
                    {contact.unread_count}
                  </span>
                )}
              </div>
            </button>
          ))}

          {filteredGroups.length === 0 && filteredContacts.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">No people or groups found</p>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 flex flex-col">
        {isConversationOpen ? (
          <>
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">{conversationTitle}</h3>
                {conversationSubtitle && (
                  <p className="text-xs text-slate-500">{conversationSubtitle}</p>
                )}
              </div>
              {selectedChat?.type === 'group' && (
                <button
                  onClick={() => {
                    setGroupModalMode('edit');
                    setShowGroupModal(true);
                  }}
                  disabled={!can('group_chat.edit')}
                  className="p-2 text-slate-500 hover:text-blue-900 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Settings fontSize="small" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
              {messages.length === 0 && selectedUserId && !selectedChatId && (
                <div className="text-center text-slate-400 text-sm py-12">
                  No messages yet. Say hello to {selectedContact?.name}!
                </div>
              )}
              {messages.map((msg) => {
                const isOwn = msg.sender_id === user?.id;
                const senderName = msg.sender
                  ? `${msg.sender.first_name} ${msg.sender.last_name}`
                  : 'Unknown';

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-md px-4 py-2 rounded-2xl ${
                        msg.message_type === 'system'
                          ? 'bg-slate-200 text-slate-600 text-xs text-center mx-auto'
                          : isOwn
                            ? 'bg-blue-900 text-white rounded-br-sm'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                      }`}
                    >
                      {!isOwn && selectedChat?.type === 'group' && msg.message_type !== 'system' && (
                        <p className="text-xs font-semibold text-blue-700 mb-1">{senderName}</p>
                      )}
                      {msg.reply_to && (
                        <div className="text-xs opacity-70 border-l-2 pl-2 mb-1">
                          {msg.reply_to.message}
                        </div>
                      )}
                      {renderMessageContent(msg)}
                      <div
                        className={`flex items-center gap-2 mt-1 text-xs ${
                          isOwn ? 'text-blue-200 justify-end' : 'text-slate-400'
                        }`}
                      >
                        <span>{formatTime(msg.created_at)}</span>
                        {msg.edited_at && <span>(edited)</span>}
                        <span>{readStatus(msg, isOwn, selectedChat?.type === 'group')}</span>
                        {isOwn && msg.message_type !== 'system' && (
  <>
    {msg.message_type === 'text' && (
      <button
        disabled={!canEditOwnMessage}
        onClick={() => {
          if (!canEditOwnMessage) return;
          setEditingMessageId(msg.id);
          setMessageInput(msg.message || '');
        }}
      >
        <Edit sx={{ fontSize: 12 }} />
      </button>
    )}
    <button
        disabled={!canDeleteOwnMessage}
       onClick={async () => {
  if (!canDeleteOwnMessage) return;
  try {
    await chatService.deleteMessage(msg.id);
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to delete message');
  }
}}
      >
        <Delete sx={{ fontSize: 12 }} />
      </button>
    </>
  )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {typingUsers.length > 0 && (
              <div className="px-6 py-1 text-xs text-slate-500 italic">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}

            <div className="p-4 border-t border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp,.gif"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, f.type.startsWith('image/') ? 'image' : 'file');
                  }}
                />
                <button
                  disabled={!canUploadFiles || isRecordingVoice}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-500 hover:text-blue-900 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Attach file"
                >
                  <AttachFile />
                </button>

                <VoiceRecorder
                  onRecordingComplete={handleVoiceRecordingComplete}
                  onCancel={handleVoiceRecordingCancel}
                  onRecordingStateChange={handleVoiceRecordingStateChange}
                  maxDuration={120}
                  disabled={!canSendAudio}
                />

                {!isRecordingVoice && (
                  <>
                    <input
                      value={messageInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                    <button
                      onClick={handleSend}
                      disabled={sending || !messageInput.trim() || !canSendInCurrentChat}
                      className="p-3 bg-blue-900 text-white rounded-full hover:bg-blue-800 disabled:opacity-50"
                    >
                      <Send fontSize="small" />
                    </button>
                  </>
                )}

                {isRecordingVoice && (
                  <div className="flex-1 flex items-center justify-center px-4 py-2 text-sm text-blue-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
                    Recording voice message...
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Chat sx={{ fontSize: 64, opacity: 0.3 }} />
            <p className="mt-4">Select a conversation to start messaging</p>
          </div>
        )}
      </div>

      {showGroupModal && (
        <GroupManagementModal
          key={groupModalMode === 'edit' ? `edit-${selectedChatId}` : 'create'}
          chatId={groupModalMode === 'edit' ? selectedChatId : null}
          onClose={() => setShowGroupModal(false)}
          onCreated={() => {
            setShowGroupModal(false);
            loadChats();
          }}
        />
      )}
    </div>
  );
};

export default InternalChat;