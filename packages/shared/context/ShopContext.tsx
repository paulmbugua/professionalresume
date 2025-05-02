// packages/shared/context/ShopContext.tsx
import React, {
  createContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  ReactNode,
  useContext,
} from 'react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import debounce from 'lodash.debounce';
import type {
  ShopContextValue,
  Profile,
  Conversation,
  ChatMessage,
  RawConversation,
} from '@mytutorapp/shared/types/ShopContextTypes';

// Define interfaces for dependencies to inject
export interface ShopContextDependencies {
  storage?: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  };
  navigateFn?: (destination: string) => void;
  alertFn?: (message: string) => void;
}

// Provider props now require a backendUrl.
interface ShopContextProviderProps extends ShopContextDependencies {
  children: ReactNode;
  backendUrl: string;
}

// Create the context with undefined initial value.
export const ShopContext = createContext<ShopContextValue | undefined>(undefined);

const ShopContextProvider: React.FC<ShopContextProviderProps> = ({
  children,
  storage,
  navigateFn,
  alertFn,
  backendUrl,
}) => {
  const [token, setTokenState] = useState<string>('');
  const [language, setLanguage] = useState<string>('EN');
  const [chats, setChats] = useState<Conversation[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSocketReady, setIsSocketReady] = useState<boolean>(false);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [tokens, setTokens] = useState<number>(0);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Create socket only if token exists.
  const socket: Socket | null = useMemo(() => {
    if (token) {
      return io(backendUrl, {
        query: { token },
        transports: ['websocket'],
        autoConnect: false,
      });
    }
    return null;
  }, [backendUrl, token]);

  // Load token from injected storage if available.
  useEffect(() => {
    const loadToken = async () => {
      if (storage) {
        try {
          const storedToken = await storage.getItem('token');
          if (storedToken) {
            setTokenState(storedToken);
          }
        } catch (error) {
          console.error('Error loading token:', error);
        }
      }
    };
    loadToken();
  }, [storage]);

  const fetchUserDetails = useCallback(async (): Promise<void> => {
    try {
      const response = await axios.get(`${backendUrl}/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        const { userId, email, tokens } = response.data;
        if (userId) {
          setUserId(String(userId));
        }
        if (email) setUserEmail(email);
        if (tokens !== undefined) setTokens(tokens);
      } else {
        console.warn('Invalid response: missing user details.');
      }
    } catch (error: unknown) {
      console.error('Error fetching user details:', error);
    }
  }, [backendUrl, token]);

  const fetchProfile = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      const response = await axios.get(`${backendUrl}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.profileExists && response.data.profile) {
        setProfile(response.data.profile);
      } else {
        setProfile(null);
      }
    } catch (error: unknown) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  }, [backendUrl, token]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    setLoadingProfile(true);
    await fetchProfile();
    setLoadingProfile(false);
  }, [fetchProfile]);

  const refreshUserDetails = useCallback(async (): Promise<void> => {
    await fetchUserDetails();
  }, [fetchUserDetails]);

  // Setup socket connections if available.
  useEffect(() => {
    if (socket && token && profile?.id) {
      socket.connect();
      const handleConnect = () => {
        setIsSocketReady(true);
        socket.emit('joinRoom', String(profile.id));
        console.log('Socket connected with profile id:', profile.id);
      };
      const handleMessageReceived = (data: {
        recipientId: string;
        senderId: string;
        content: string;
        senderName: string;
        unread: boolean;
      }) => {
        if (String(data.recipientId) === String(profile.id)) {
          setChats((prevChats) => {
            const updatedChats = [...prevChats];
            const chatIndex = updatedChats.findIndex(
              (chat) => String(chat.recipientId) === String(data.senderId)
            );
            const newMsg: ChatMessage = {
              sender: data.senderName,
              content: data.content,
              unread: data.unread,
            };
            if (chatIndex > -1) {
              updatedChats[chatIndex].messages.push(newMsg);
              if (data.unread) {
                updatedChats[chatIndex].unreadCount += 1;
              }
            } else {
              updatedChats.push({
                conversationId: '',
                recipientId: String(data.senderId),
                user: data.senderName,
                lastMessage: data.content,
                unreadCount: data.unread ? 1 : 0,
                avatar: 'default-avatar.png',
                messages: [newMsg],
              });
            }
            return updatedChats;
          });
          if (data.unread) {
            setUnreadMessagesCount((prevCount) => prevCount + 1);
          }
        }
      };
      const handleDisconnect = () => {
        setIsSocketReady(false);
        console.log('Socket disconnected');
      };
      socket.on('connect', handleConnect);
      socket.on('messageReceived', handleMessageReceived);
      socket.on('disconnect', handleDisconnect);
      return () => {
        socket.off('connect', handleConnect);
        socket.off('messageReceived', handleMessageReceived);
        socket.off('disconnect', handleDisconnect);
        socket.disconnect();
      };
    }
  }, [socket, token, profile]);

  useEffect(() => {
    if (token) {
      fetchUserDetails();
      fetchProfile();
    }
  }, [backendUrl, token, fetchUserDetails, fetchProfile]);

  useEffect(() => {
    console.log('Updated userEmail in context:', userEmail);
  }, [userEmail]);

  const fetchConversations = useCallback(async (): Promise<void> => {
    try {
      const response = await axios.get(`${backendUrl}/api/profileActions/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data && response.data.conversations) {
        const formattedConversations: Conversation[] = response.data.conversations.map(
          (conv: RawConversation) => {
            const currentProfileId = profile?.id;
            const isSender = String(currentProfileId) === String(conv.sender_id);
            const otherParticipantId = isSender ? conv.recipient_id : conv.sender_id;
            const otherParticipantName = isSender ? conv.recipient_name : conv.sender_name;
            const avatar = isSender ? conv.recipient_avatar : conv.sender_avatar;

            return {
              conversationId: conv.id,
              recipientId: otherParticipantId,
              user: otherParticipantName,
              lastMessage: conv.last_message,
              unreadCount: Number(conv.unread_count),
              avatar: avatar || 'default-avatar.png',
              messages: conv.messages,
            };
          }
        );

        const initialUnreadCount = formattedConversations.reduce(
          (total, chat) => total + (chat.unreadCount || 0),
          0
        );
        setUnreadMessagesCount(initialUnreadCount);
        setChats(formattedConversations);
      }
    } catch (error: unknown) {
      console.error('Failed to fetch conversations:', error);
    }
  }, [backendUrl, token, profile]);

  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token, fetchConversations]);

  const fetchMessages = useCallback(
    async (recipientId: string, limit = 20, offset = 0): Promise<void> => {
      if (!token || !recipientId) return;
      try {
        const response = await axios.get(
          `${backendUrl}/api/profileActions/conversations/${recipientId}/messages`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit, offset },
          }
        );
        setChats((prevChats) => {
          const updatedChats = [...prevChats];
          const chatIndex = updatedChats.findIndex(
            (chat) => String(chat.recipientId) === String(recipientId)
          );
          const newMessages: ChatMessage[] = response.data.messages || [];
          if (chatIndex > -1) {
            const merged = [...updatedChats[chatIndex].messages, ...newMessages];
            const uniqueMessages = Array.from(
              new Map(merged.map((msg) => [msg.id, msg])).values()
            ) as ChatMessage[];
            uniqueMessages.sort(
              (a, b) =>
                new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime()
            );
            updatedChats[chatIndex].messages = uniqueMessages;
          } else {
            newMessages.sort(
              (a, b) =>
                new Date(a.timestamp || '').getTime() - new Date(b.timestamp || '').getTime()
            );
            updatedChats.push({
              conversationId: '',
              recipientId: String(recipientId),
              user: '', // fill as needed
              lastMessage: '',
              unreadCount: 0,
              avatar: 'default-avatar.png',
              messages: newMessages,
            });
          }
          return updatedChats;
        });
      } catch (error: unknown) {
        console.error('Failed to fetch messages:', error);
        if (alertFn) alertFn('Failed to load messages. Please try again.');
      }
    },
    [token, backendUrl, alertFn]
  );

  const sendMessage = useCallback(
    ({ recipientId, content }: { recipientId: string; content: string }): void => {
      if (!token || !profile?.id) {
        if (alertFn) alertFn('You need to be logged in to send messages.');
        return;
      }
      if (isSocketReady && socket) {
        socket.emit('sendMessage', {
          recipientId: String(recipientId),
          content,
          senderId: String(profile.id),
          senderName: profile.name || 'Your Name',
          unread: true,
        });
        setChats((prevChats) => {
          const updatedChats = [...prevChats];
          const chatIndex = updatedChats.findIndex(
            (chat) => String(chat.recipientId) === String(recipientId)
          );
          const newMessageObj: ChatMessage = {
            sender: profile.id,
            content,
            unread: false,
            timestamp: new Date().toISOString(),
          };
          if (chatIndex > -1) {
            updatedChats[chatIndex].messages.push(newMessageObj);
          } else {
            updatedChats.push({
              conversationId: '',
              recipientId: String(recipientId),
              user: '', // fill as needed
              lastMessage: content,
              unreadCount: 0,
              avatar: 'default-avatar.png',
              messages: [newMessageObj],
            });
          }
          return updatedChats;
        });
      }
    },
    [token, profile, isSocketReady, socket, alertFn]
  );

  // Create a debounced function for marking messages as read.
  const debouncedMarkAsRead = useMemo(
    () =>
      debounce(async (recipientId: string) => {
        try {
          await axios.post(
            `${backendUrl}/api/profileActions/conversations/${recipientId}/markAsRead`,
            null,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        } catch (error: unknown) {
          console.error('Failed to mark messages as read:', error);
        }
      }, 300),
    [backendUrl, token]
  );

  // Ensure that the debounced function is canceled on unmount.
  useEffect(() => {
    return () => {
      debouncedMarkAsRead.cancel();
    };
  }, [debouncedMarkAsRead]);

  const markAsRead = useCallback(
    async (recipientId: string): Promise<void> => {
      if (isSocketReady && socket) {
        socket.emit('markAsRead', {
          recipientId: String(recipientId),
          senderId: String(profile?.id),
        });
      }
      const unreadCountForChat =
        chats.find((chat) => String(chat.recipientId) === String(recipientId))?.unreadCount || 0;
      setUnreadMessagesCount((prevCount) => Math.max(prevCount - unreadCountForChat, 0));
      setChats((prevChats) =>
        prevChats.map((chat) =>
          String(chat.recipientId) === String(recipientId)
            ? {
                ...chat,
                unreadCount: 0,
                messages: chat.messages.map((msg) => ({ ...msg, unread: false })),
              }
            : chat
        )
      );
      // Trigger the debounced API call.
      debouncedMarkAsRead(recipientId);
    },
    [isSocketReady, socket, chats, debouncedMarkAsRead, profile]
  );

  const updateToken = useCallback(
    async (newToken: string): Promise<void> => {
      setTokenState(newToken);
      if (storage) {
        await storage.setItem('token', newToken);
      } else {
        console.warn('No storage provided.');
      }
    },
    [storage]
  );

  const logout = useCallback(async (): Promise<void> => {
    setTokenState('');
    setUserId(null);
    setUserEmail(null);
    setIsSocketReady(false);
    if (storage) {
      await storage.removeItem('token');
    }
    if (navigateFn) {
      navigateFn('/login');
    }
  }, [storage, navigateFn]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === 'EN' ? 'FR' : 'EN'));
  }, []);

  // Memoize the context value to avoid unnecessary re-renders.
  const value: ShopContextValue = useMemo(
    () => ({
      backendUrl,
      token,
      language,
      setToken: updateToken,
      toggleLanguage,
      logout,
      chats,
      setChats,
      socket,
      userEmail,
      setTokens,
      tokens,
      setTokenBalance: setTokens,
      markAsRead,
      sendMessage,
      fetchMessages,
      fetchConversations,
      userId,
      loadingProfile,
      isSocketReady,
      unreadMessagesCount,
      profile,
      refreshProfile,
      refreshUserDetails,
    }),
    [
      backendUrl,
      token,
      language,
      updateToken,
      toggleLanguage,
      logout,
      chats,
      socket,
      userEmail,
      tokens,
      userId,
      loadingProfile,
      isSocketReady,
      unreadMessagesCount,
      profile,
      markAsRead,
      sendMessage,
      fetchMessages,
      fetchConversations,
      refreshProfile,
      refreshUserDetails,
    ]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export const useShopContext = () => {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShopContext must be used within a ShopContextProvider');
  }
  return context;
};

export default ShopContextProvider;
