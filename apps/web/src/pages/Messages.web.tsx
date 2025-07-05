// apps/web/src/pages/Messages.web.tsx

import React, { useEffect, useRef, ChangeEvent, useMemo } from 'react';
import debounce from 'lodash.debounce';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faPaperPlane,
  faSmile,
  faBars,
  faTimes,
  faHome,
} from '@fortawesome/free-solid-svg-icons';
import { useMessages } from '@mytutorapp/shared/hooks';
import type { ChatMessage } from '@mytutorapp/shared/types/ShopContextTypes';
import chat from '../assets/chat.png';

const Messages: React.FC = () => {
  const location = useLocation();
  const {
    activeChat,
    setActiveChat,
    newMessage,
    setNewMessage,
    isSidebarOpen,
    setSidebarOpen,
    openChat,
    loadMoreMessages,
    handleSendMessage,
    chats,
    myProfile,
    messageContainerRef,
  } = useMessages();

  // Debounce sendMessage so rapid taps only fire once per 300ms
  const debouncedSend = useMemo(
    () =>
      debounce(() => {
        if (newMessage.trim()) {
          handleSendMessage();
        }
      }, 300),
    [handleSendMessage, newMessage]
  );

  // Debounce loadMoreMessages on scroll so it only fires once per 500ms
  const debouncedLoadMore = useMemo(
    () =>
      debounce(loadMoreMessages, 500, {
        leading: true,
        trailing: false,
      }),
    [loadMoreMessages]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      debouncedSend.cancel();
      debouncedLoadMore.cancel();
    };
  }, [debouncedSend, debouncedLoadMore]);

  // Scroll handler triggers debounced load more
  const handleScroll = () => {
    const container = messageContainerRef.current;
    if (container instanceof HTMLElement && container.scrollTop < 100) {
      debouncedLoadMore();
    }
  };

  // Auto-open chat if URL has studentId param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const studentId = params.get('studentId');
    if (studentId && !activeChat && chats.length > 0) {
      const chatToOpen = chats.find(
        (c) => String(c.recipientId) === studentId
      );
      if (chatToOpen) openChat(chatToOpen);
    }
  }, [location.search, chats, activeChat, openChat]);

  // Focus the input when chat opens
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (activeChat && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [activeChat]);

  if (!myProfile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  // Convert messages shape
  const convertedMessages =
    activeChat?.messages?.map((msg: ChatMessage & { sender_id?: string }) => ({
      sender_id: msg.sender_id,
      sender_name: msg.sender_name || '',
      content: msg.content,
      unread: msg.unread,
      created_at: msg.timestamp || new Date().toISOString(),
    })) || [];

  return (
    <div className="flex h-screen bg-gray-900 text-gray-200 font-sans relative">
      {/* Home button */}
      <Link
        to="/"
        className="absolute top-4 left-1/2 transform -translate-x-1/2 text-gray-400 hover:text-pink-500 transition-colors"
      >
        <FontAwesomeIcon
          icon={faHome as IconProp}
          className="text-2xl md:text-3xl opacity-80 hover:opacity-100"
        />
      </Link>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 transform transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 w-72 max-w-xs bg-gray-800 shadow-xl p-4 overflow-y-auto border-r border-gray-700 z-20`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-pink-500">Chats</h2>
          <button onClick={() => setSidebarOpen(false)} className="text-gray-400 md:hidden">
            <FontAwesomeIcon icon={faTimes as IconProp} />
          </button>
        </div>
        <ul className="space-y-4">
          {chats.length > 0 ? (
            chats.map((chatItem, idx) => (
              <li
                key={`${chatItem.recipientId}-${idx}`}
                onClick={() => openChat(chatItem)}
                className={`p-3 rounded-lg cursor-pointer transition ${
                  chatItem.messages?.some(
                    (m) => m.unread && m.sender !== myProfile.id
                  )
                    ? 'bg-gray-700'
                    : 'bg-gray-800'
                } hover:bg-gray-700 shadow-sm`}
              >
                <div className="flex items-center space-x-3">
                  <img
                    src={myProfile.role === 'tutor' ? chat : chatItem.avatar || chat}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full border-2 border-pink-500"
                  />
                  <div className="flex-grow">
                    <span className="font-semibold text-pink-400">
                      {chatItem.user || chatItem.recipientId}
                    </span>
                    <p className="text-sm text-gray-400 truncate">
                      {chatItem.lastMessage || 'Start a conversation'}
                    </p>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <p className="text-center text-gray-300">No chats available</p>
          )}
        </ul>
      </div>

      {/* Chat Area */}
      <div className="flex-grow flex flex-col bg-gray-900 md:ml-72">
        <div className="flex items-center justify-between p-4 bg-gray-800 shadow-lg border-b border-gray-700">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 md:hidden">
            <FontAwesomeIcon icon={faBars as IconProp} />
          </button>
          {activeChat ? (
            <div className="absolute left-16 md:left-20 flex items-center space-x-3">
              <img
                src={myProfile.role === 'tutor' ? chat : activeChat.avatar || chat}
                alt="Avatar"
                className="w-8 h-8 rounded-full"
              />
              <h3 className="text-lg font-semibold text-pink-400">
                {activeChat.user || activeChat.recipientId}
              </h3>
            </div>
          ) : (
            <h3 className="text-lg font-semibold text-gray-400">Your Messages</h3>
          )}
          {activeChat && (
            <button
              onClick={() => setActiveChat(null)}
              className="text-gray-400 hover:text-gray-200"
            >
              <FontAwesomeIcon icon={faTimes as IconProp} />
            </button>
          )}
        </div>

        <div
          ref={messageContainerRef as React.RefObject<HTMLDivElement>}
          onScroll={handleScroll}
          className="flex-grow p-4 overflow-y-auto bg-gray-800 space-y-3"
        >
          {activeChat ? (
            <div className="space-y-3">
              {convertedMessages
                .slice()
                .sort(
                  (a, b) =>
                    new Date(a.created_at).getTime() -
                    new Date(b.created_at).getTime()
                )
                .map((msg, i) => {
                  const isSender = String(msg.sender_id) === String(myProfile.id);
                  const displayName = isSender ? 'You' : msg.sender_name || '';
                  return (
                    <div
                      key={i}
                      className={`flex ${
                        isSender ? 'justify-end' : 'justify-start'
                      } transition-transform`}
                    >
                      <div
                        className={`${
                          isSender
                            ? 'bg-pink-500 text-white'
                            : 'bg-gray-700 text-gray-200'
                        } px-4 py-2 rounded-lg max-w-xs shadow-lg mb-1`}
                      >
                        <p className="text-sm">
                          {isSender ? '' : `${displayName}: `}
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center text-gray-500">
              <p>Select a chat to view messages.</p>
            </div>
          )}
        </div>

        {activeChat && (
          <div className="p-4 bg-gray-800 shadow-xl flex items-center space-x-3 border-t border-gray-700">
            <textarea
              ref={messageInputRef}
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setNewMessage(e.target.value)
              }
              className="flex-grow p-2 rounded-lg bg-gray-900 border border-gray-600 text-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none transition-shadow"
            />
            <button className="text-gray-400 hover:text-pink-500 transition">
              <FontAwesomeIcon icon={faSmile as IconProp} />
            </button>
            <button
              onClick={debouncedSend}
              className="bg-pink-500 text-white px-4 py-2 rounded-lg flex items-center shadow-lg hover:bg-pink-600 transition"
            >
              <FontAwesomeIcon icon={faPaperPlane as IconProp} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
