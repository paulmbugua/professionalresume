// apps/mobile/src/screens/Messages.native.tsx

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FontAwesome } from '@expo/vector-icons';
import { useMessages } from '@mytutorapp/shared/hooks';
import tw from '../../tailwind';
import chat from '../../assets/chat.png';
import type {
  Conversation,
  ChatMessage as SharedChatMessage,
} from '@mytutorapp/shared/types/ShopContextTypes';

interface RouteParams {
  studentId?: string;
}

type RootStackParamList = {
  Home: undefined;
};

const MessagesNative: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<{ params: RouteParams }, 'params'>>();

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

  // Combine send + refresh
  const sendAndRefresh = () => {
    handleSendMessage();
    if (activeChat) {
      openChat(activeChat);
    }
  };

  // Scroll helper
  const scrollToBottom = () => {
    const ref = messageContainerRef as React.RefObject<ScrollView>;
    ref.current?.scrollToEnd({ animated: false });
  };

  // Auto-open via param
  useEffect(() => {
    const { studentId } = route.params || {};
    if (studentId && !activeChat && chats.length) {
      const chatToOpen = chats.find(
        (c) => String(c.recipientId) === String(studentId)
      );
      if (chatToOpen) openChat(chatToOpen);
    }
  }, [route.params, chats, activeChat, openChat]);

  // Focus input on open
  const messageInputRef = useRef<TextInput>(null);
  useEffect(() => {
    messageInputRef.current?.focus();
  }, [activeChat]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages.length]);

  // Sort messages
  const sortedMessages = useMemo<SharedChatMessage[]>(() => {
    return (activeChat?.messages || [])
      .slice()
      .sort(
        (a, b) =>
          new Date(a.timestamp || '').getTime() -
          new Date(b.timestamp || '').getTime()
      );
  }, [activeChat?.messages]);

  if (!myProfile) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <Text style={tw`text-white`}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-900 relative`}>
      {/* Home Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Home')}
        accessibilityLabel="Go Home"
        accessibilityHint="Navigate to the home screen"
        style={[
          tw`absolute top-4 z-30`,
          { left: '50%', transform: [{ translateX: -12 }] },
        ]}
      >
        <FontAwesome
          name="home"
          size={24}
          color="#A0AEC0"
          style={tw`opacity-80`}
        />
      </TouchableOpacity>

      {/* Sidebar */}
      {isSidebarOpen && (
        <View
          style={tw`absolute top-0 bottom-0 left-0 z-20 w-72 bg-gray-800 p-4 border-r-2 border-gray-700`}
        >
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <Text style={tw`text-2xl font-bold text-pink-500`}>Chats</Text>
            <TouchableOpacity
              onPress={() => setSidebarOpen(false)}
              accessibilityLabel="Close chats"
              accessibilityHint="Close the chats sidebar"
            >
              <FontAwesome name="times" size={24} color="#A0AEC0" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {chats.length > 0 ? (
              chats.map((chatItem) => {
                const isActive =
                  activeChat?.conversationId === chatItem.conversationId;
                return (
                  <TouchableOpacity
                    key={chatItem.conversationId}
                    onPress={() => {
                      openChat(chatItem);
                      setSidebarOpen(false);
                    }}
                    accessibilityLabel={`Open chat with ${chatItem.name}`}
                    style={tw`mb-4`}
                  >
                    <View
                      style={[
                        tw`flex-row items-center p-2 rounded`,
                        isActive && { backgroundColor: '#374151' },
                      ]}
                    >
                      <Image
                        source={
                          myProfile.role === 'tutor'
                            ? chat
                            : chatItem.avatar
                            ? { uri: chatItem.avatar }
                            : chat
                        }
                        style={tw`w-10 h-10 rounded-full border-2 border-pink-500 mr-3`}
                      />
                      <View style={tw`flex-1 flex-row items-center`}>
                        <View style={tw`flex-1`}>
                          <Text style={tw`font-semibold text-pink-400`}>
                            {chatItem.name}
                          </Text>
                          <Text
                            style={tw`text-sm text-gray-400`}
                            numberOfLines={1}
                          >
                            {chatItem.lastMessage || 'Start a conversation'}
                          </Text>
                        </View>
                        {chatItem.unreadCount > 0 && (
                          <View style={tw`bg-red-600 rounded-full px-2 ml-2`}>
                            <Text style={tw`text-white text-xs`}>
                              {chatItem.unreadCount}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={tw`text-center text-gray-300`}>
                No chats available
              </Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Chat Area */}
      <View style={tw`flex-1 bg-gray-900`}>
        <View
          style={tw`flex-row items-center justify-between p-4 bg-gray-800 border-b border-gray-700`}
        >
          <TouchableOpacity
            onPress={() => setSidebarOpen(true)}
            accessibilityLabel="Open chats"
            accessibilityHint="Open the chats sidebar"
            style={tw`p-2`}
          >
            <FontAwesome name="bars" size={24} color="#A0AEC0" />
          </TouchableOpacity>

          {activeChat ? (
            <View
              style={{
                position: 'absolute',
                left: 64,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Image
                source={
                  myProfile.role === 'tutor'
                    ? chat
                    : activeChat.avatar
                    ? { uri: activeChat.avatar }
                    : chat
                }
                style={tw`w-8 h-8 rounded-full mr-3`}
              />
              <Text style={tw`text-lg font-semibold text-pink-400`}>
                {activeChat.name}
              </Text>
            </View>
          ) : (
            <Text style={tw`text-lg font-semibold text-gray-400`}>
              Your Messages
            </Text>
          )}

          {activeChat && (
            <TouchableOpacity
              onPress={() => setActiveChat(null)}
              accessibilityLabel="Close chat"
              accessibilityHint="Close the current chat"
            >
              <FontAwesome name="times" size={24} color="#A0AEC0" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={messageContainerRef as React.RefObject<ScrollView>}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) =>
            e.nativeEvent.contentOffset.y < 100 && loadMoreMessages()
          }
          scrollEventThrottle={16}
          onContentSizeChange={scrollToBottom}
          style={tw`flex-1 p-4 bg-gray-800`}
        >
          {activeChat ? (
            sortedMessages.map((msg, idx) => {
              const { sender_id, sender, sender_name } = msg as SharedChatMessage & {
            sender_id?: string;
            sender_name?: string;
          }

  // Prefer the raw sender_id if present, otherwise fallback to sender
  const rawSenderId = String(sender_id ?? sender)
  const isSender   = rawSenderId === String(myProfile.id)
  const displayName= isSender ? 'You' : sender_name ?? ''
              return (
                <View
                  key={`${msg.id ?? msg.timestamp}-${idx}`}
                  accessible
                  accessibilityLabel={msg.content}
                  style={{
                    alignSelf: isSender ? 'flex-end' : 'flex-start',
                    marginBottom: 12,
                    maxWidth: '80%',
                  }}
                >
                  <View
                    style={[
                      tw`p-3 rounded-lg`,
                      {
                        backgroundColor: isSender
                          ? '#ec4899'
                          : '#374151',
                      },
                    ]}
                  >
                    <Text style={tw`text-sm text-gray-200`}>
                      {msg.content}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={tw`flex-1 items-center justify-center`}>
              <Text style={tw`text-gray-500`}>
                Select a chat to view messages.
              </Text>
            </View>
          )}
        </ScrollView>

        {activeChat && (
          <View
            style={tw`flex-row items-center p-4 bg-gray-800 border-t border-gray-700`}
          >
            <TextInput
              ref={messageInputRef}
              accessibilityLabel="Message input"
              accessibilityHint="Type your message here"
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              onSubmitEditing={sendAndRefresh}
              blurOnSubmit={false}
              returnKeyType="send"
              style={tw`flex-1 p-2 rounded-l-lg bg-gray-900 border border-gray-600 text-gray-200`}
              multiline={false}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              accessibilityLabel="Insert emoji"
              accessibilityHint="Open emoji picker"
              style={tw`px-3`}
            >
              <FontAwesome name="smile-o" size={24} color="#A0AEC0" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={sendAndRefresh}
              accessibilityLabel="Send message"
              accessibilityHint="Send the message you typed"
              style={tw`bg-pink-500 px-4 py-2 rounded-r-lg`}
            >
              <FontAwesome name="paper-plane" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default MessagesNative;
