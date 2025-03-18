import { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { 
  fetchUserDetails, 
  fetchProfile, 
  fetchConversations, 
  fetchMessages, 
  markAsRead 
} from '../api/shopApi';

export interface ShopData {
  token: string;
  backendUrl: string;
  language: string;
  userEmail: string | null;
  tokens: number;
  profile: any;
  chats: any[];
  unreadMessagesCount: number;
  isSocketReady: boolean;
  socket: any;
}

interface ShopActions {
  setToken: (token: string) => void;
  setLanguage: (lang: string) => void;
  setChats: React.Dispatch<React.SetStateAction<any[]>>;
  refreshUserDetails: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendMessage: (recipientId: string, content: string, senderName: string) => void;
  markAsRead: (recipientId: string) => Promise<void>;
  fetchMessages: (recipientId: string, limit?: number, offset?: number) => Promise<any>;
  fetchConversations: () => Promise<any>;
}

export const useShopData = (initialToken: string, backendUrl: string): [ShopData, ShopActions] => {
  const [token, setToken] = useState(initialToken);
  const [language, setLanguage] = useState('EN');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tokens, setTokens] = useState(0);
  const [profile, setProfile] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isSocketReady, setIsSocketReady] = useState(false);

  // Create a memoized socket if token is available
  const socket = useMemo(() => {
    if (token) {
      return io(backendUrl, {
        query: { token },
        transports: ['websocket'], // Force WebSocket usage
        autoConnect: false,
      });
    }
    return null;
  }, [backendUrl, token]);

  const refreshUserDetails = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchUserDetails(backendUrl, token);
      setUserEmail(data.email);
      setTokens(data.tokens || 0);
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  }, [backendUrl, token]);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchProfile(backendUrl, token);
      setProfile(data.profileExists && data.profile ? data.profile : null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  }, [backendUrl, token]);

  useEffect(() => {
    if (token) {
      refreshUserDetails();
      refreshProfile();
    }
  }, [token, refreshUserDetails, refreshProfile]);

  // Socket listeners
  useEffect(() => {
    if (socket && token && profile?.id) {
      socket.connect();
      const handleConnect = () => {
        setIsSocketReady(true);
        socket.emit("joinRoom", String(profile.id));
      };
      const handleMessageReceived = (data: any) => {
        // Update chats (you can add your own merge logic here)
        setChats((prevChats) => [...prevChats, data]);
        if (data.unread) {
          setUnreadMessagesCount((prev) => prev + 1);
        }
      };
      const handleDisconnect = () => {
        setIsSocketReady(false);
      };
      socket.on("connect", handleConnect);
      socket.on("messageReceived", handleMessageReceived);
      socket.on("disconnect", handleDisconnect);
      return () => {
        socket.off("connect", handleConnect);
        socket.off("messageReceived", handleMessageReceived);
        socket.off("disconnect", handleDisconnect);
        socket.disconnect();
      };
    }
  }, [socket, token, profile]);

  const actions: ShopActions = {
    setToken,
    setLanguage,
    setChats,
    refreshUserDetails,
    refreshProfile,
    sendMessage: (recipientId, content, senderName) => {
      if (socket && profile) {
        socket.emit("sendMessage", {
          recipientId,
          content,
          senderId: String(profile.id),
          senderName: senderName || (profile.name || "Unknown"),
          unread: true,
        });
      }
    },
    markAsRead: async (recipientId: string) => {
      await markAsRead(backendUrl, token, recipientId);
    },
    fetchMessages: async (recipientId: string, limit = 20, offset = 0) => {
      return await fetchMessages(backendUrl, token, recipientId, limit, offset);
    },
    fetchConversations: async () => {
      return await fetchConversations(backendUrl, token);
    },
  };

  const data: ShopData = {
    token,
    backendUrl,
    language,
    userEmail,
    tokens,
    profile,
    chats,
    unreadMessagesCount,
    isSocketReady,
    socket,
  };

  return [data, actions];
};
