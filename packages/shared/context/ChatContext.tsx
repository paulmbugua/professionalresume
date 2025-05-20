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

export const ChatProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { backendUrl, token, profile } = useShopContext();

  const [chats, setChats] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSocketReady, setSocketReady] = useState(false);

  // 1) Initialize socket
  const socket: Socket | null = useMemo(() => {
    if (!token) return null;
    return io(backendUrl, {
      query: { token },
      transports: ['websocket'],
      autoConnect: false,
    });
  }, [backendUrl, token]);

  // 2) Connect + subscribe
  useEffect(() => {
    if (!socket || !profile?.id) return;
    socket.connect();
    socket.on('connect', () => setSocketReady(true));
    socket.on('disconnect', () => setSocketReady(false));

    socket.on('messageReceived', (data: RawConversation) => {
      // build Conversation obj from RawConversation
      const incoming: Conversation = {
        conversationId: data.id,
        recipientId: data.sender_id.toString(),
        user: data.sender_name,
        lastMessage: data.last_message,
        unreadCount: Number(data.unread_count),
        avatar: data.sender_avatar ?? '',
        messages: data.messages,
      };

      setChats((prev) => {
        const idx = prev.findIndex((c) => c.recipientId === incoming.recipientId);
        if (idx > -1) {
          const copy = [...prev];
          copy[idx] = {
            ...copy[idx],
            lastMessage: incoming.lastMessage,
            unreadCount: copy[idx].unreadCount + incoming.unreadCount,
            messages: [...copy[idx].messages, ...incoming.messages],
          };
          return copy;
        }
        return [...prev, incoming];
      });

      setUnreadCount((u) => u + Number(data.unread_count));
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('messageReceived');
      socket.disconnect();
    };
  }, [socket, profile]);

  // 3) Fetch all conversations
  const fetchConversations = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/profileActions/conversations`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const formatted: Conversation[] = data.conversations.map(
        (c: RawConversation) => ({
          conversationId: c.id,
          recipientId: c.recipient_id.toString(),
          user: c.recipient_name,
          lastMessage: c.last_message,
          unreadCount: Number(c.unread_count),
          avatar: c.recipient_avatar ?? '',
          messages: c.messages,
        })
      );
      setChats(formatted);
      setUnreadCount(formatted.reduce((sum, c) => sum + c.unreadCount, 0));
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  }, [backendUrl, token]);

  // 4) Fetch paged messages
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

  // 5) Send via socket
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
    [socket, isSocketReady, profile]
  );

  // 6) Mark as read (debounced API call)
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

  // 7) Fetch on mount
  useEffect(() => {
    if (token) fetchConversations();
  }, [token, fetchConversations]);

  // 8) Memoize the context value
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
    [
      chats,
      unreadCount,
      isSocketReady,
      fetchConversations,
      fetchMessages,
      sendMessage,
      markAsRead,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = (): ChatContextValue => {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return ctx;
};
