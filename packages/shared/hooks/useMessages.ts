import { useState, useEffect, useRef, useContext } from 'react';
import * as RN from 'react-native';
import { useSafeRoute, useSafeNavigate } from '../utils/navigation';
import { toast } from 'react-toastify';
import { ShopContext, ShopContextValue } from '../context/ShopContext';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  unread: boolean;
  sender_name?: string;
}

interface Chat {
  conversationId?: string;
  recipientId: string;
  user: string;
  lastMessage: string;
  unreadCount: number;
  avatar?: string;
  messages: Message[];
}

export const useMessages = () => {
  const location = useSafeRoute();
  const navigate = useSafeNavigate();

  const shopContext = useContext(ShopContext);
  if (!shopContext) {
    throw new Error("ShopContext is not provided");
  }
  const {
    token,
    fetchConversations,
    fetchMessages,
    chats,
    markAsRead,
    sendMessage,
    profile: myProfile,
    socket,
  } = shopContext as ShopContextValue;

  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [messageOffset, setMessageOffset] = useState(0);
  const messagesLimit = 20;

  // Conditionally type the ref: for mobile, use ScrollView from react-native.
  const messageContainerRef = useRef<RN.ScrollView>(null);

  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token, fetchConversations]);

  useEffect(() => {
    if (activeChat) {
      const updatedActive = chats.find(
        (chat: Chat) => String(chat.recipientId) === String(activeChat.recipientId)
      );
      if (updatedActive && updatedActive !== activeChat) {
        setActiveChat(updatedActive);
      }
    }
  }, [chats, activeChat]);

  useEffect(() => {
    if (messageContainerRef.current && activeChat) {
      if (RN.Platform.OS === 'web') {
        (messageContainerRef.current as unknown as HTMLDivElement).scrollTop =
          (messageContainerRef.current as unknown as HTMLDivElement).scrollHeight;
      } else {
        messageContainerRef.current.scrollToEnd({ animated: true });
      }
    }
  }, [activeChat?.messages]);

  useEffect(() => {
    if (socket && activeChat) {
      socket.on(
        'messageDeleted',
        ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
          if (conversationId === activeChat.conversationId) {
            setActiveChat((prev: Chat | null) => {
              if (!prev) return prev;
              return {
                ...prev,
                messages: prev.messages.filter((msg) => msg.id !== messageId),
              };
            });
          }
        }
      );
      socket.on(
        'conversationDeleted',
        ({ conversationId }: { conversationId: string }) => {
          if (conversationId === activeChat.conversationId) {
            setActiveChat(null);
            fetchConversations();
          }
        }
      );
      return () => {
        socket.off('messageDeleted');
        socket.off('conversationDeleted');
      };
    }
  }, [socket, activeChat, fetchConversations]);

  useEffect(() => {
    if (RN.Platform.OS === 'web') {
      const closeContextMenu = () => { /* optional logic */ };
      document.addEventListener('click', closeContextMenu);
      return () => document.removeEventListener('click', closeContextMenu);
    }
  }, []);

  const openChat = (chat: Chat) => {
    setActiveChat(chat);
    setMessageOffset(0);
    fetchMessages(chat.recipientId, messagesLimit, 0);
    setSidebarOpen(false);
    if (chat.messages?.some((msg) => msg.unread && msg.sender_id !== myProfile.id)) {
      markAsRead(chat.recipientId);
    }
  };

  const loadMoreMessages = () => {
    if (activeChat) {
      const newOffset = messageOffset + messagesLimit;
      fetchMessages(activeChat.recipientId, messagesLimit, newOffset);
      setMessageOffset(newOffset);
    }
  };

  const handleScroll = (event: any) => {
    if (RN.Platform.OS === 'web') {
      const container = messageContainerRef.current as unknown as HTMLDivElement;
      if (container && container.scrollTop < 100) {
        loadMoreMessages();
      }
    } else {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (offsetY < 100) {
        loadMoreMessages();
      }
    }
  };

  const handleSendMessage = () => {
    if (!token) {
      toast.error('You need to be logged in to send messages.');
      return;
    }
    if (newMessage.trim() && activeChat) {
      sendMessage({ recipientId: activeChat.recipientId, content: newMessage });
      setNewMessage('');
      setTimeout(() => {
        if (messageContainerRef.current) {
          if (RN.Platform.OS === 'web') {
            (messageContainerRef.current as unknown as HTMLDivElement).scrollTop =
              (messageContainerRef.current as unknown as HTMLDivElement).scrollHeight;
          } else {
            messageContainerRef.current.scrollToEnd({ animated: true });
          }
        }
      }, 100);
    } else {
      toast.error("Message content can't be empty.");
    }
  };

  useEffect(() => {
    const searchString =
      typeof (location as any).search === 'string' ? (location as any).search : '';
    const queryParams = new URLSearchParams(searchString);
    const studentId = queryParams.get('studentId');
    if (studentId) {
      const existingChat = chats.find(
        (chat: Chat) => String(chat.recipientId) === studentId
      );
      if (existingChat) {
        setActiveChat(existingChat);
        fetchMessages(studentId, messagesLimit, 0);
      } else {
        toast.info('No existing chat found with this student. Start a new conversation.');
        navigate('/messages');
      }
    }
  }, [(location as any).search, chats, fetchMessages, navigate]);

  return {
    activeChat,
    setActiveChat,
    newMessage,
    setNewMessage,
    isSidebarOpen,
    setSidebarOpen,
    messageOffset,
    messageContainerRef,
    handleScroll,
    handleSendMessage,
    openChat,
    loadMoreMessages,
    chats,
    myProfile,
  };
};
