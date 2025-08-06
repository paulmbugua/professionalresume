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
import chatPlaceholder from '../../assets/chat.png';
import type { ChatMessage as SharedChatMessage } from '@mytutorapp/shared/types/ShopContextTypes';

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

  const sendAndRefresh = () => {
    handleSendMessage();
  };

  const scrollToBottom = () => {
    const ref = messageContainerRef as React.RefObject<ScrollView>;
    ref.current?.scrollToEnd({ animated: false });
  };

  // Auto-open via param
  useEffect(() => {
    const { studentId } = route.params || {};
    if (studentId && !activeChat && chats.length) {
      const chatToOpen = chats.find(
        (c) => c.recipientId === studentId
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

  // Sort messages by timestamp
  const sortedMessages = useMemo<SharedChatMessage[]>(() => {
    return (activeChat?.messages || [])
      .slice()
       .sort((a, b) => {
        const tA = new Date(a.timestamp ?? '').getTime();
        const tB = new Date(b.timestamp ?? '').getTime();
        return tA - tB;
      });
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
        style={[tw`absolute top-4 z-30`, { left: '50%', transform: [{ translateX: -12 }] }]}
      >
        <FontAwesome name="home" size={24} color="#A0AEC0" style={tw`opacity-80`} />
      </TouchableOpacity>

      {/* Sidebar */}
      {isSidebarOpen && (
        <View style={tw`absolute top-0 bottom-0 left-0 z-20 w-72 bg-gray-800 p-4 border-r-2 border-gray-700`}>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <Text style={tw`text-2xl font-bold text-pink-500`}>Chats</Text>
            <TouchableOpacity onPress={() => setSidebarOpen(false)}>
              <FontAwesome name="times" size={24} color="#A0AEC0" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {chats.length > 0 ? (
              chats.map((chatItem) => {
                const isActive = activeChat?.conversationId === chatItem.conversationId;
                return (
                  <TouchableOpacity
                    key={chatItem.conversationId}
                    onPress={() => {
                      openChat(chatItem);
                      setSidebarOpen(false);
                    }}
                    style={tw`mb-4`}
                  >
                    <View style={[tw`flex-row items-center p-2 rounded`, isActive && { backgroundColor: '#374151' }]}>
                      <Image
                        source={
                          myProfile.role === 'tutor'
                            ? chatPlaceholder
                            : chatItem.avatar
                            ? { uri: chatItem.avatar }
                            : chatPlaceholder
                        }
                        style={tw`w-10 h-10 rounded-full border-2 border-pink-500 mr-3`}
                      />
                      <View style={tw`flex-1 flex-row items-center`}>
                        <View style={tw`flex-1`}>
                          <Text style={tw`font-semibold text-pink-400`}>{chatItem.name}</Text>
                          <Text style={tw`text-sm text-gray-400`} numberOfLines={1}>
                            {chatItem.lastMessage || 'Start a conversation'}
                          </Text>
                        </View>
                        {chatItem.unreadCount > 0 && (
                          <View style={tw`bg-red-600 rounded-full px-2 ml-2`}>
                            <Text style={tw`text-white text-xs`}>{chatItem.unreadCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={tw`text-center text-gray-300`}>No chats available</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Chat Area */}
      <View style={tw`flex-1 bg-gray-900`}>
        <View style={tw`flex-row items-center justify-between p-4 bg-gray-800 border-b border-gray-700`}>
          <TouchableOpacity onPress={() => setSidebarOpen(true)} style={tw`p-2`}>
            <FontAwesome name="bars" size={24} color="#A0AEC0" />
          </TouchableOpacity>

          {activeChat ? (
            <View style={{ position: 'absolute', left: 64, flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={
                  myProfile.role === 'tutor'
                    ? chatPlaceholder
                    : activeChat.avatar
                    ? { uri: activeChat.avatar }
                    : chatPlaceholder
                }
                style={tw`w-8 h-8 rounded-full mr-3`}
              />
              <Text style={tw`text-lg font-semibold text-pink-400`}>{activeChat.name}</Text>
            </View>
          ) : (
            <Text style={tw`text-lg font-semibold text-gray-400`}>Your Messages</Text>
          )}

          {activeChat && (
            <TouchableOpacity onPress={() => setActiveChat(null)}>
              <FontAwesome name="times" size={24} color="#A0AEC0" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={messageContainerRef as React.RefObject<ScrollView>}
          onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (e.nativeEvent.contentOffset.y < 100) {
              loadMoreMessages();
            }
          }}
          scrollEventThrottle={16}
          onContentSizeChange={scrollToBottom}
          style={tw`flex-1 p-4 bg-gray-800`}
        >
          {activeChat ? (
            sortedMessages.map((msg) => {
              const isSender = msg.sender === String(myProfile.id);
              const displayName = isSender ? 'You' : msg.sender_name;
              return (
                <View
                  key={msg.id}
                  accessible
                  accessibilityLabel={msg.content}
                  style={{
                    alignSelf: isSender ? 'flex-end' : 'flex-start',
                    marginBottom: 12,
                    maxWidth: '80%',
                  }}
                >
                  <View style={[tw`p-3 rounded-lg`, { backgroundColor: isSender ? '#ec4899' : '#374151' }]}>
                    {!isSender && displayName && (
                      <Text style={tw`text-xs font-semibold text-gray-400 mb-1`}>{displayName}</Text>
                    )}
                    <Text style={tw`text-sm text-gray-200`}>{msg.content}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={tw`flex-1 items-center justify-center`}>
              <Text style={tw`text-gray-500`}>Select a chat to view messages.</Text>
            </View>
          )}
        </ScrollView>

        {activeChat && (
          <View style={tw`flex-row items-center p-4 bg-gray-800 border-t border-gray-700`}>
            <TextInput
              ref={messageInputRef}
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              onSubmitEditing={sendAndRefresh}
              blurOnSubmit={false}
              returnKeyType="send"
              style={tw`flex-1 p-2 rounded-l-lg bg-gray-900 border border-gray-600 text-gray-200`}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity style={tw`px-3`}>
              <FontAwesome name="smile-o" size={24} color="#A0AEC0" />
            </TouchableOpacity>
            <TouchableOpacity onPress={sendAndRefresh} style={tw`bg-pink-500 px-4 py-2 rounded-r-lg`}>
              <FontAwesome name="paper-plane" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default MessagesNative;
