// packages/shared/hooks/useMessages.ts

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useShopContext, useChatContext } from '@mytutorapp/shared/context';
import type { Conversation } from '@mytutorapp/shared/types/ShopContextTypes';

type ScrollEvent = {
  nativeEvent: {
    contentOffset: { y: number };
  };
};

const useMessages = () => {
  // 1) Auth + lightweight user profile
  const { token, profile: myProfile } = useShopContext();

  // 2) Chat‐specific methods & data
  const {
    fetchConversations,
    fetchMessages,
    chats,
    markAsRead,
    sendMessage,
  } = useChatContext();

  // 3) Local UI state
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [messageOffset, setMessageOffset] = useState(0);
  const messagesLimit = 20;

  // 4) Ref & helper to scroll
  const messageContainerRef = useRef<unknown>(null);
  const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
  const scrollToBottom = () => {
    const ref = messageContainerRef.current;
    if (!ref) return;

    if (isWeb && ref instanceof HTMLElement) {
      ref.scrollTop = ref.scrollHeight;
    } else {
      (ref as any).scrollToEnd?.({ animated: true });
    }
  };

  // 5) Load all conversations once we have a token
  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token, fetchConversations]);

  // 6) Keep the activeChat up to date if chats[] changes
  useEffect(() => {
    if (activeChat) {
      const updated = chats.find(c => c.recipientId === activeChat.recipientId);
      if (updated && updated !== activeChat) {
        setActiveChat(updated);
      }
    }
  }, [chats, activeChat]);

  // 7) Auto‐scroll when messages change
  useEffect(() => {
    if (activeChat?.messages?.length) {
      scrollToBottom();
    }
  }, [activeChat?.messages]);

  // 8) Open a chat thread
  const openChat = (chat: Conversation) => {
    setActiveChat(chat);
    setMessageOffset(0);
    fetchMessages(chat.recipientId, messagesLimit, 0);
    setSidebarOpen(false);

    // mark unread if from the other user
    if (chat.messages.some(m => m.unread && m.sender !== myProfile?.id)) {
      markAsRead(chat.recipientId);
    }
  };

  // 9) Load more when scrolled to top
  const loadMoreMessages = () => {
    if (!activeChat) return;
    const newOffset = messageOffset + messagesLimit;
    fetchMessages(activeChat.recipientId, messagesLimit, newOffset);
    setMessageOffset(newOffset);
  };

  const handleScroll = (e: ScrollEvent) => {
    const y = e.nativeEvent.contentOffset.y;
    if (isWeb) {
      const el = messageContainerRef.current;
      if (el instanceof HTMLElement && el.scrollTop < 100) {
        loadMoreMessages();
      }
    } else if (y < 100) {
      loadMoreMessages();
    }
  };

  // 10) Send a new message
  const handleSendMessage = () => {
    if (!token) {
      toast.error('You need to be logged in to send messages.');
      return;
    }
    if (!activeChat || !newMessage.trim()) {
      toast.error("Message can't be empty.");
      return;
    }
    sendMessage(activeChat.recipientId, newMessage.trim());
    setNewMessage('');
    setTimeout(scrollToBottom, 100);
  };

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

export default useMessages;
