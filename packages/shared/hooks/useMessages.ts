import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useShopContext, useChatContext } from '@mytutorapp/shared/context';
import type { Conversation } from '@mytutorapp/shared/types/ShopContextTypes';

type ScrollEvent = {
  nativeEvent: { contentOffset: { y: number } };
};

const useMessages = () => {
  // 1) Auth + profile
  const { token, profile: myProfile } = useShopContext();

  // 2) Chat methods & data
  const {
    fetchConversations,
    fetchMessages,
    chats,
    markAsRead,
    sendMessage,
  } = useChatContext();

  // 3) UI state
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [messageOffset, setMessageOffset] = useState(0);
  const messagesLimit = 20;

  // StrictMode guard to avoid double fetch in dev
  const fetchedOnce = useRef(false);

  // 4) Scrolling helper
  const messageContainerRef = useRef<unknown>(null);
  const isWeb =
    typeof window !== 'undefined' && typeof document !== 'undefined';
  const scrollToBottom = () => {
    const ref = messageContainerRef.current as any;
    if (!ref) return;
    if (isWeb && ref instanceof HTMLElement) {
      ref.scrollTop = ref.scrollHeight;
    } else {
      ref.scrollToEnd?.({ animated: true });
    }
  };

  // 5) Initial load
  useEffect(() => {
    if (!token) return;
    if (fetchedOnce.current) return;
    fetchedOnce.current = true;
    fetchConversations();
  }, [token, fetchConversations]);

  // 6) Sync activeChat when `chats` changes
  useEffect(() => {
    if (!activeChat) return;
    const updated = chats.find(
      (c) => c.conversationId === activeChat.conversationId
    );
    if (updated) {
      setActiveChat(updated);
    }
  }, [chats, activeChat]);

  // 7) Auto-scroll on new messages
  useEffect(() => {
    if (activeChat?.messages?.length) {
      scrollToBottom();
    }
  }, [activeChat?.messages]);

  // 8) Open a thread
  const openChat = async (chat: Conversation) => {
    setActiveChat(chat);
    setMessageOffset(0);

    await fetchMessages(chat.recipientId, messagesLimit, 0);
    setSidebarOpen(false);

    // mark unread as read
    if (chat.messages.some((m) => m.unread && m.sender !== myProfile?.id)) {
      await markAsRead(chat.recipientId);
      await fetchConversations();
    }
  };

  // 9) Load more on scroll
  const loadMoreMessages = () => {
    if (!activeChat) return;
    const newOffset = messageOffset + messagesLimit;
    fetchMessages(activeChat.recipientId, messagesLimit, newOffset);
    setMessageOffset(newOffset);
  };

  const handleScroll = (e: ScrollEvent) => {
    const y = e.nativeEvent.contentOffset.y;
    if (isWeb) {
      const el = messageContainerRef.current as any;
      if (el instanceof HTMLElement && el.scrollTop < 100) {
        loadMoreMessages();
      }
    } else if (y < 100) {
      loadMoreMessages();
    }
  };

  // 10) Send a message
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
