import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { useShopContext } from '@shared/context';
import type { Conversation } from '@shared/types/ShopContextTypes';

type ScrollEvent = {
  nativeEvent: {
    contentOffset: {
      y: number;
    };
  };
};

const useMessages = () => {
  const {
    token,
    fetchConversations,
    fetchMessages,
    chats,
    markAsRead,
    sendMessage,
    profile: myProfile,
    socket,
  } = useShopContext();

  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [messageOffset, setMessageOffset] = useState(0);
  const messagesLimit = 20;

  const messageContainerRef = useRef<unknown>(null); // platform-agnostic
  const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

  const scrollToBottom = () => {
    const ref = messageContainerRef.current;
    if (!ref) return;

    if (isWeb && ref instanceof HTMLElement) {
      ref.scrollTop = ref.scrollHeight;
    } else if (
      typeof (ref as { scrollToEnd?: (options: { animated: boolean }) => void }).scrollToEnd === 'function'
    ) {
      (ref as { scrollToEnd: (options: { animated: boolean }) => void }).scrollToEnd({ animated: true });
    }
  };

  useEffect(() => {
    if (token) {
      fetchConversations();
    }
  }, [token, fetchConversations]);

  useEffect(() => {
    if (activeChat) {
      const updatedActive = chats.find(
        (chat: Conversation) => String(chat.recipientId) === String(activeChat.recipientId)
      );
      if (updatedActive && updatedActive !== activeChat) {
        setActiveChat(updatedActive);
      }
    }
  }, [chats, activeChat]);

  useEffect(() => {
    if (activeChat?.messages?.length) {
      scrollToBottom();
    }
  }, [activeChat?.messages]);

  useEffect(() => {
    if (socket && activeChat) {
      socket.on('messageDeleted', ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
        if (conversationId === activeChat.conversationId) {
          setActiveChat((prev: Conversation | null) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.filter((msg) => msg.id !== messageId),
            };
          });
        }
      });

      socket.on('conversationDeleted', ({ conversationId }: { conversationId: string }) => {
        if (conversationId === activeChat.conversationId) {
          setActiveChat(null);
          fetchConversations();
        }
      });

      return () => {
        socket.off('messageDeleted');
        socket.off('conversationDeleted');
      };
    }
  }, [socket, activeChat, fetchConversations]);

  useEffect(() => {
    if (isWeb) {
      const closeContextMenu = () => {};
      document.addEventListener('click', closeContextMenu);
      return () => document.removeEventListener('click', closeContextMenu);
    }
  }, [isWeb]);

  const openChat = (chat: Conversation) => {
    setActiveChat(chat);
    setMessageOffset(0);
    fetchMessages(chat.recipientId, messagesLimit, 0);
    setSidebarOpen(false);
    if (chat.messages?.some((msg) => msg.unread && msg.sender !== myProfile?.id)) {
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

  const handleScroll = (event: ScrollEvent) => {
    if (isWeb) {
      const el = messageContainerRef.current;
      if (el instanceof HTMLElement && el.scrollTop < 100) {
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
      setTimeout(scrollToBottom, 100);
    } else {
      toast.error("Message content can't be empty.");
    }
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
