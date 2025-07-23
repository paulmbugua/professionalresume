// packages/shared/context/ChatContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import debounce from 'lodash/debounce';
import { useShopContext } from './ShopContext';
import type {
  RawConversation,
  Conversation,
  ChatMessage,
  ChatContextValue,
} from '@mytutorapp/shared/types/ShopContextTypes';

export const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { backendUrl, token, profile } = useShopContext();
  const [chats, setChats] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSocketReady, setSocketReady] = useState(false);

  // Initialize socket
  const socket: Socket | null = useMemo(() => {
    if (!token) return null;
    return io(backendUrl, {
      query: { token },
      transports: ['websocket'],
      autoConnect: false,
    });
  }, [backendUrl, token]);

  // Helper: map RawConversation → UI Conversation
  const mapRaw = useCallback(
    (r: RawConversation): Conversation => {
      const me = String(profile?.id);
      const sender = String(r.sender_id);
      const recipient = String(r.recipient_id);

      const amSender = sender === me;
      const peerId    = amSender ? recipient : sender;
      const peerName  = amSender ? r.recipient_name : r.sender_name;
      const peerAvatar = amSender ? r.recipient_avatar : r.sender_avatar;

      return {
        conversationId: String(r.id),
        recipientId:    peerId,
        name:           peerName,
        avatar:         peerAvatar ?? '',
        lastMessage:    r.last_message,
        unreadCount:    Number(r.unread_count),
        messages:       r.messages,
      };
    },
    [profile?.id]
  );

  // Socket connection & handlers
  useEffect(() => {
    if (!socket || !profile?.id) return;

    socket.connect();
    socket.on('connect', () => setSocketReady(true));
    socket.on('disconnect', () => setSocketReady(false));

    socket.on('messageReceived', (raw: RawConversation) => {
      const incoming = mapRaw(raw);
      console.log('[ChatContext] socket messageReceived →', incoming);

      setChats((prev) => {
        const idx = prev.findIndex(c => c.conversationId === incoming.conversationId);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = {
            ...updated[idx],
            lastMessage: incoming.lastMessage,
            unreadCount: updated[idx].unreadCount + incoming.unreadCount,
            messages:    [...updated[idx].messages, ...incoming.messages],
          };
          return updated;
        }
        return [incoming, ...prev];
      });

      setUnreadCount(u => u + incoming.unreadCount);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('messageReceived');
      socket.disconnect();
    };
  }, [socket, profile?.id, mapRaw]);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/profileActions/conversations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const raw: RawConversation[] = data.conversations;
      const formatted = raw
        .filter(r => String(r.sender_id) !== String(r.recipient_id))
        .map(mapRaw);

      console.log('[ChatContext] fetchConversations →', formatted);

      setChats(formatted);
      setUnreadCount(formatted.reduce((sum, c) => sum + c.unreadCount, 0));
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  }, [backendUrl, token, mapRaw]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(
    async (recipientId: string, limit = 20, offset = 0) => {
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/profileActions/conversations/${recipientId}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit, offset },
          }
        );
        const newMsgs: ChatMessage[] = data.messages;
        setChats((prev) =>
          prev.map((c) =>
            c.recipientId === recipientId
              ? { ...c, messages: [...c.messages, ...newMsgs] }
              : c
          )
        );
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    },
    [backendUrl, token]
  );

  // Send a message via socket
  const sendMessage = useCallback(
    (recipientId: string, content: string) => {
      if (socket && isSocketReady && profile?.id) {
        socket.emit('sendMessage', {
          recipientId,
          content,
          senderId: profile.id,
          unread: true,
        });
      }
    },
    [socket, isSocketReady, profile?.id]
  );

  // Mark as read (debounced)
  const markAsRead = useMemo(
    () =>
      debounce(async (recipientId: string) => {
        try {
          await axios.post(
            `${backendUrl}/api/profileActions/conversations/${recipientId}/markAsRead`,
            null,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (err) {
          console.error('Error marking as read:', err);
        }
      }, 300),
    [backendUrl, token]
  );

  // Initial fetch on mount
  useEffect(() => {
    if (token) fetchConversations();
  }, [token, fetchConversations]);

  // Provide context value
  const value = useMemo<ChatContextValue>(
    () => ({
      chats,
      unreadCount,
      isSocketReady,
      fetchConversations,
      fetchMessages,
      sendMessage,
      markAsRead,
    }),
    [chats, unreadCount, isSocketReady, fetchConversations, fetchMessages, sendMessage, markAsRead]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = (): ChatContextValue => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within a ChatProvider');
  return ctx;
};
