// packages/shared/context/ShopContext.tsx
import React, {
  createContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";
// Instead of useNavigate, import our safe navigation hook.
import { useSafeNavigate } from "../utils/navigation";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import { toast } from "react-toastify";
import { storage } from "../utils/storage";
import { getBackendUrl } from "../utils/env";

// Define the interface for your context’s value.
export interface ShopContextValue {
  backendUrl: string;
  token: string;
  language: string;
  setToken: (newToken: string) => Promise<void>;
  toggleLanguage: () => void;
  logout: () => Promise<void>;
  chats: any[];
  setChats: Dispatch<SetStateAction<any[]>>;
  socket: Socket | null;
  userEmail: string | null;
  setTokens: Dispatch<SetStateAction<number>>;
  tokens: number;
  setTokenBalance: React.Dispatch<React.SetStateAction<number>>;
  markAsRead: (recipientId: string) => Promise<void>;
  sendMessage: (params: { recipientId: string; content: string }) => void;
  fetchMessages: (recipientId: string, limit?: number, offset?: number) => Promise<void>;
  fetchConversations: () => Promise<void>;
  userId: string | null;
  loadingProfile: boolean;
  isSocketReady: boolean;
  unreadMessagesCount: number;
  profile: any; // Replace with a more specific type if available
  refreshProfile: () => Promise<void>;
  refreshUserDetails: () => Promise<void>;
}

// Create the context with an undefined default.
export const ShopContext = createContext<ShopContextValue | undefined>(undefined);

interface ShopContextProviderProps {
  children: ReactNode;  
}

const ShopContextProvider: React.FC<ShopContextProviderProps> = ({ children }) => {
  const backendUrl = getBackendUrl();
  // Initialize token state without using localStorage directly.
  const [token, setTokenState] = useState<string>("");
  const [language, setLanguage] = useState<string>("EN");
  const [chats, setChats] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSocketReady, setIsSocketReady] = useState<boolean>(false);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const navigate = useSafeNavigate(); // Use our safe navigation hook.
  const [tokens, setTokens] = useState<number>(0);
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [profile, setProfile] = useState<any>(null);

  const socket: Socket | null = useMemo(() => {
    if (token) {
      return io(backendUrl, {
        query: { token },
        transports: ["websocket"],
        autoConnect: false,
      });
    }
    return null;
  }, [backendUrl, token]);

  // Load token using our storage helper
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await storage.getItem("token");
        if (storedToken) {
          setTokenState(storedToken);
        }
      } catch (error) {
        console.error("Error loading token:", error);
      }
    };
    loadToken();
  }, []);

  const fetchUserDetails = async (): Promise<void> => {
    try {
      const response = await axios.get(`${backendUrl}/api/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Response from API:", response.data);
      if (response.data) {
        const { userId, email, tokens } = response.data;
        if (userId) {
          setUserId(String(userId));
          console.log("User ID set in context:", userId);
        }
        if (email) setUserEmail(email);
        if (tokens !== undefined) setTokens(tokens);
      } else {
        console.warn("Invalid response: missing user details.");
      }
    } catch (error: any) {
      console.error("Error fetching user details:", error.response?.data || error.message);
    }
  };

  const fetchProfile = async (): Promise<void> => {
    try {
      if (!token) return;
      const response = await axios.get(`${backendUrl}/api/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Profile API Response:", response.data);
      if (response.data.profileExists && response.data.profile) {
        setProfile(response.data.profile);
      } else {
        setProfile(null);
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error.response?.data || error.message);
      setProfile(null);
    } finally {
      setLoadingProfile(false);
    }
  };

  const refreshProfile = async (): Promise<void> => {
    setLoadingProfile(true);
    await fetchProfile();
    setLoadingProfile(false);
  };

  const refreshUserDetails = async (): Promise<void> => {
    await fetchUserDetails();
  };

  useEffect(() => {
    if (socket && token && profile?.id) {
      socket.connect();

      const handleConnect = () => {
        setIsSocketReady(true);
        socket.emit("joinRoom", String(profile.id));
        console.log("Socket connected with profile id:", profile.id);
      };

      const handleMessageReceived = (data: any) => {
        const { recipientId, senderId, content, senderName, unread } = data;
        if (String(recipientId) === String(profile.id)) {
          setChats((prevChats) => {
            const updatedChats = [...prevChats];
            const chatIndex = updatedChats.findIndex(
              (chat) => String(chat.userId) === String(senderId)
            );
            if (chatIndex > -1) {
              updatedChats[chatIndex].messages.push({ user: senderName, content, unread });
              if (unread) updatedChats[chatIndex].unreadCount += 1;
            } else {
              updatedChats.push({
                userId: String(senderId),
                messages: [{ user: senderName, content, unread }],
                unreadCount: unread ? 1 : 0,
                avatar: "default-avatar.png",
              });
            }
            return updatedChats;
          });
          if (unread) {
            setUnreadMessagesCount((prevCount) => prevCount + 1);
          }
        }
      };

      const handleDisconnect = () => {
        setIsSocketReady(false);
        console.log("Socket disconnected");
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

  useEffect(() => {
    if (token) {
      console.log("Fetching user details...");
      fetchUserDetails();
      fetchProfile();
    }
  }, [token]);

  useEffect(() => {
    console.log("Updated userEmail in context:", userEmail);
  }, [userEmail]);

  const fetchConversations = useCallback(async (): Promise<void> => {
    try {
      const response = await axios.get(`${backendUrl}/api/profileActions/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data && response.data.conversations) {
        const formattedConversations = response.data.conversations.map((conv: any) => {
          console.log("conv.unread_count type:", typeof conv.unread_count, conv.unread_count);
          const currentProfileId = profile?.id;
          const isSender = String(currentProfileId) === String(conv.sender_id);
          const otherParticipantId = isSender ? conv.recipient_id : conv.sender_id;
          const otherParticipantName = isSender ? conv.recipient_name : conv.sender_name;
          const avatar = isSender ? conv.recipient_avatar : conv.sender_avatar;
          console.log("Conversation data:", conv);
          return {
            conversationId: conv.id,
            recipientId: otherParticipantId,
            user: otherParticipantName,
            lastMessage: conv.last_message,
            unreadCount: Number(conv.unread_count),
            avatar: avatar || "default-avatar.png",
            messages: conv.messages,
          };
        });
        const initialUnreadCount = formattedConversations.reduce(
          (total: number, chat: any) => total + (chat.unreadCount || 0),
          0
        );
        setUnreadMessagesCount(initialUnreadCount);
        console.log("Initial unreadMessagesCount from fetchConversations:", initialUnreadCount);
        setChats(formattedConversations);
      }
    } catch (error: any) {
      console.error("Failed to fetch conversations:", error);
    }
  }, [backendUrl, token, userId, profile]);

  useEffect(() => {
    if (token) {
      console.log("Fetching conversations after login...");
      fetchConversations();
    }
  }, [token, fetchConversations]);

  const fetchMessages = async (recipientId: string, limit = 20, offset = 0): Promise<void> => {
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
        const newMessages = response.data.messages || [];
        if (chatIndex > -1) {
          const merged = [...updatedChats[chatIndex].messages, ...newMessages];
          const uniqueMessages = Array.from(
            new Map(merged.map((msg: any) => [msg.id, msg])).values()
          );
          uniqueMessages.sort(
            (a: any, b: any) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          updatedChats[chatIndex].messages = uniqueMessages;
        } else {
          newMessages.sort(
            (a: any, b: any) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          updatedChats.push({
            recipientId: String(recipientId),
            messages: newMessages,
            avatar: "default-avatar.png",
          });
        }
        return updatedChats;
      });
    } catch (error: any) {
      console.error("Failed to fetch messages:", error);
      toast.error("Failed to load messages. Please try again.");
    }
  };

  const sendMessage = ({ recipientId, content }: { recipientId: string; content: string }): void => {
    if (!token || !profile?.id) {
      toast.error("You need to be logged in to send messages.");
      return;
    }
    if (isSocketReady && socket) {
      console.log("ShopContext sendMessage - Payload:", {
        recipientId: String(recipientId),
        content,
        senderId: String(profile.id),
        senderName: profile?.name || "Your Name",
      });
      socket.emit("sendMessage", {
        recipientId: String(recipientId),
        content,
        senderId: String(profile.id),
        senderName: profile?.name || "Your Name",
        unread: true,
      });
      setChats((prevChats) => {
        const updatedChats = [...prevChats];
        const chatIndex = updatedChats.findIndex(
          (chat) => String(chat.recipientId) === String(recipientId)
        );
        const newMessageObj = {
          sender_id: profile.id,
          sender: { id: profile.id },
          content,
          timestamp: new Date().toISOString(),
          unread: false,
        };
        if (chatIndex > -1) {
          updatedChats[chatIndex].messages.push(newMessageObj);
        } else {
          updatedChats.push({
            recipientId: String(recipientId),
            messages: [newMessageObj],
            avatar: "default-avatar.png",
          });
        }
        return updatedChats;
      });
    }
  };

  const markAsRead = async (recipientId: string): Promise<void> => {
    if (isSocketReady && socket) {
      socket.emit("markAsRead", { recipientId: String(recipientId), senderId: String(profile?.id) });
    }
    const unreadCountForChat = chats.find(
      (chat) => String(chat.recipientId) === String(recipientId)
    )?.unreadCount || 0;
    setUnreadMessagesCount((prevCount) => Math.max(prevCount - unreadCountForChat, 0));
    setChats((prevChats) =>
      prevChats.map((chat) =>
        String(chat.recipientId) === String(recipientId)
          ? { ...chat, unreadCount: 0, messages: chat.messages.map((msg: any) => ({ ...msg, unread: false })) }
          : chat
      )
    );
    try {
      await axios.post(`${backendUrl}/api/profileActions/conversations/${recipientId}/markAsRead`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error: any) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  const updateToken = async (newToken: string): Promise<void> => {
    setTokenState(newToken);
    if (newToken) {
      await storage.setItem("token", newToken);
    } else {
      await logout();
    }
  };

  const logout = async (): Promise<void> => {
    setTokenState("");
    setUserId(null);
    setUserEmail(null);
    setIsSocketReady(false);
    await storage.removeItem("token");
    navigate("/login");
  };

  const value: ShopContextValue = {
    backendUrl,
    token,
    language,
    setToken: updateToken,
    toggleLanguage: () => setLanguage((prev) => (prev === "EN" ? "FR" : "EN")),
    logout,
    chats,
    setChats,
    socket,
    userEmail,
    setTokens,
    tokens,
    setTokenBalance,
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
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

export default ShopContextProvider;
