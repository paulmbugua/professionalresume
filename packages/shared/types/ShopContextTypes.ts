// packages/shared/types/ShopContextTypes.ts
import { Socket } from 'socket.io-client';

export interface Profile {
  id: string;
  name: string;
  category: string;
  expertise: string[];
  teachingStyle: string[];
  gallery: string[];
  role?: string;
  email?: string;
  // Add more fields as needed
}

export interface ChatMessage {
  id?: string;
  sender: string;
  content: string;
  unread: boolean;
  timestamp?: string;
  sender_name?: string;
}

export interface Conversation {
  conversationId: string;
  recipientId: string;
  user: string;
  lastMessage: string;
  unreadCount: number;
  avatar: string;
  messages: ChatMessage[];
}
export interface RawConversation {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar?: string;
  recipient_id: string;
  recipient_name: string;
  recipient_avatar?: string;
  last_message: string;
  unread_count: number;
  messages: ChatMessage[];
}

export interface ShopContextValue {
  backendUrl: string;
  token: string;
  language: string;
  setToken: (newToken: string) => Promise<void>;
  toggleLanguage: () => void;
  logout: () => Promise<void>;
  chats: Conversation[];
  setChats: React.Dispatch<React.SetStateAction<Conversation[]>>;
  socket: Socket | null;
  userEmail: string | null;
  setTokens: React.Dispatch<React.SetStateAction<number>>;
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
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  refreshUserDetails: () => Promise<void>;
}
