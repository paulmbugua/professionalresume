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
  AppState,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { FontAwesome } from '@expo/vector-icons';
import { useMessages } from '@mytutorapp/shared/hooks';
import { useIsFocused } from '@react-navigation/native';
import { notifyNow } from '../../utils/notifications';
import tw from '../../tailwind';
import chat from '../../assets/chat.png';
import type { ChatMessage as SharedChatMessage } from '@mytutorapp/shared/types/ShopContextTypes';

type RootStackParamList = { Home: undefined };
type LoginNav = StackNavigationProp<RootStackParamList, 'Home'>;

interface RouteParams {
  studentId?: string;
}
type RouteT = RouteProp<{ params: RouteParams }, 'params'>;

/** Shape we render for items in the chat list (loose, based on usage) */
type ChatListItem = {
  conversationId: string | number;
  name: string;
  avatar?: string;
  lastMessage?: string;
  unreadCount?: number;
  recipientId?: string | number;
  messages?: Array<
    SharedChatMessage & {
      timestamp?: string;
      created_at?: string;
      sender_id?: string | number;
      sender?: string | number;
      sender_name?: string;
    }
  >;
};

const MessagesNative: React.FC = () => {
  const navigation = useNavigation<LoginNav>();
  const route = useRoute<RouteT>();

  const {
    activeChat,
    setActiveChat,
    newMessage,
    setNewMessage,
    isSidebarOpen,
    setSidebarOpen,
    openChat,
    handleSendMessage,
    handleScroll, // might be provided by hook; prefer this
    loadMoreMessages, // legacy fallback
    chats,
    myProfile,
    messageContainerRef,
  } = useMessages();

  // Coerce our local list item to the stricter Conversation type that openChat expects.
  type OpenChatArg = Parameters<typeof openChat>[0];
  const toOpenChatArg = (i: ChatListItem): OpenChatArg => ({
    ...(i as unknown as OpenChatArg),
    conversationId: String(i.conversationId),
    ...(i.recipientId != null ? { recipientId: String(i.recipientId) } : {}),
  });

  const chatsArr: ChatListItem[] = Array.isArray(chats) ? (chats as ChatListItem[]) : [];

  // Only send
  const sendAndRefresh = () => {
    handleSendMessage();
  };

  const isFocused = useIsFocused();
const appStateRef = useRef(AppState.currentState);
const seenMsgIdsRef = useRef<Set<string>>(new Set());


// Track app state
useEffect(() => {
  const sub = AppState.addEventListener('change', (s) => { appStateRef.current = s; });
  return () => sub.remove();
}, []);

const myId = String(myProfile?.id ?? '');
const isFromMe = (m: any) => {
  const rawSenderId = String(m?.sender_id ?? m?.sender ?? '');
  return rawSenderId === myId;
};

// Make a stable “message id” (falls back to timestamp if no id)
const msgKey = (m: any) => String(m?.id ?? m?.timestamp ?? `${m?.sender_id ?? ''}:${m?.created_at ?? ''}`);


  // Auto-open via route param (like web’s ?studentId)
  useEffect(() => {
    const { studentId } = route.params ?? {};
    if (studentId && !activeChat && chatsArr.length > 0) {
      const chatToOpen = chatsArr.find((c) => String(c.recipientId) === String(studentId));
      if (chatToOpen) openChat(toOpenChatArg(chatToOpen));
    }
  }, [route.params, chatsArr, activeChat, openChat]);

  // Focus input on open
  const messageInputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (activeChat) messageInputRef.current?.focus();
  }, [activeChat]);

  // Scroll handler that mirrors web
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (typeof handleScroll === 'function') {
      // normalize to object that matches web’s signature
      handleScroll({
        nativeEvent: {
          contentOffset: { y: e.nativeEvent.contentOffset.y },
        },
      } as unknown as NativeSyntheticEvent<NativeScrollEvent>);
      return;
    }
    if (typeof loadMoreMessages === 'function') {
      if (e.nativeEvent.contentOffset.y < 100) loadMoreMessages();
    }
  };

  // Smooth bottom scroll when content grows
  const scrollToBottom = () => {
    (messageContainerRef as React.RefObject<ScrollView>)?.current?.scrollToEnd({ animated: false });
  };

  // Normalize + sort messages by timestamp asc
  const sortedMessages = useMemo(() => {
    const list = (activeChat?.messages || []) as ChatListItem['messages'];
    const withTs =
      list?.map((m) => ({
        ...m,
        timestamp: m?.timestamp ?? m?.created_at ?? new Date().toISOString(),
      })) ?? [];
    return withTs.slice().sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());
  }, [activeChat?.messages]);

  useEffect(() => {
    scrollToBottom();
  }, [sortedMessages.length]);

  useEffect(() => {
  // No active chat and no chats => nothing to do
  if (!Array.isArray(sortedMessages)) return;

  // Find messages not seen before
  const newlyArrived = sortedMessages.filter((m) => {
    const key = msgKey(m);
    if (!key || seenMsgIdsRef.current.has(key)) return false;
    return true;
  });

  if (newlyArrived.length === 0) return;

  // Mark all as seen now to avoid duplicate notifications
  for (const m of newlyArrived) {
    const key = msgKey(m);
    if (key) seenMsgIdsRef.current.add(key);
  }

  // Notify only for messages FROM OTHERS
  const incoming = newlyArrived.filter((m) => !isFromMe(m));
  if (incoming.length === 0) return;

  // If screen is focused AND app in foreground AND message belongs to the currently open chat,
  // we skip notifying (user can see it). Otherwise, notify.
  const shouldNotify = (m: any) => {
  const appActive = appStateRef.current === 'active';
  // if we have an active chat open, assume we're viewing *that* conversation
  const belongsToActive = Boolean(activeChat?.conversationId);
  // Notify if (screen not focused) OR (app not active) OR (we're not clearly in this chat view)
  return !isFocused || !appActive || !belongsToActive;
};
  // Fire one notification for the latest relevant message (you can batch if you prefer)
const latest = incoming.slice().reverse().find(shouldNotify);
  if (!latest) return;

  const senderName =
    (latest as any).sender_name ||
    (activeChat && activeChat.name) ||
    'New message';

  const body = String((latest as any).content ?? 'You have a new message');

  // Build deep-link payload: open Messages screen, optionally pre-select this student/chat
  const payload: Record<string, any> = {
    screen: 'Messages',
  };

  // If you store recipient or student id on the chat/message, attach it:
  const studentId =
    (latest as any).sender_id || (latest as any).sender || activeChat?.recipientId;
  if (studentId) {
    payload.params = { studentId: String(studentId) };
  }

  void notifyNow(senderName, body, payload);
}, [sortedMessages, activeChat, isFocused]);

useEffect(() => {
  seenMsgIdsRef.current = new Set();
}, [activeChat?.conversationId]);

useEffect(() => {
  for (const m of sortedMessages) {
    const key = msgKey(m);
    if (key) seenMsgIdsRef.current.add(key);
  }
  // only when the conversation changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activeChat?.conversationId]);




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
        style={[tw`absolute top-4 z-30`, { left: '50%', transform: [{ translateX: -12 }] }]}
      >
        <FontAwesome name="home" size={24} color="#A0AEC0" style={tw`opacity-80`} />
      </TouchableOpacity>

      {/* Sidebar */}
      {isSidebarOpen && (
        <View style={tw`absolute top-0 bottom-0 left-0 z-20 w-72 bg-gray-800 p-4 border-r-2 border-gray-700`}>
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
            {chatsArr.length > 0 ? (
              chatsArr.map((chatItem) => {
                const isActive = activeChat?.conversationId === String(chatItem.conversationId);
                return (
                  <TouchableOpacity
                    key={String(chatItem.conversationId)}
                    onPress={() => {
                      openChat(toOpenChatArg(chatItem));
                      setSidebarOpen(false);
                    }}
                    accessibilityLabel={`Open chat with ${chatItem.name}`}
                    style={tw`mb-4`}
                  >
                    <View
                      style={[
                        tw`flex-row items-center p-2 rounded`,
                        isActive ? { backgroundColor: '#374151' } : null,
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
                          <Text style={tw`font-semibold text-pink-400`}>{chatItem.name}</Text>
                          <Text style={tw`text-sm text-gray-400`} numberOfLines={1}>
                            {chatItem.lastMessage || 'Start a conversation'}
                          </Text>
                        </View>
                        {(chatItem.unreadCount ?? 0) > 0 && (
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
        {/* Header */}
        <View style={tw`flex-row items-center justify-between p-4 bg-gray-800 border-b border-gray-700`}>
          <TouchableOpacity
            onPress={() => setSidebarOpen(true)}
            accessibilityLabel="Open chats"
            accessibilityHint="Open the chats sidebar"
            style={tw`p-2`}
          >
            <FontAwesome name="bars" size={24} color="#A0AEC0" />
          </TouchableOpacity>

          {activeChat ? (
            <View style={{ position: 'absolute', left: 64, flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={
                  myProfile.role === 'tutor' ? chat : activeChat.avatar ? { uri: activeChat.avatar } : chat
                }
                style={tw`w-8 h-8 rounded-full mr-3`}
              />
              <Text style={tw`text-lg font-semibold text-pink-400`}>{activeChat.name}</Text>
            </View>
          ) : (
            <Text style={tw`text-lg font-semibold text-gray-400`}>Your Messages</Text>
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

        {/* Messages */}
        <ScrollView
          ref={messageContainerRef as React.RefObject<ScrollView>}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onContentSizeChange={scrollToBottom}
          style={tw`flex-1 p-4 bg-gray-800`}
        >
          {activeChat ? (
            sortedMessages.map((msg) => {
              const rawSenderId = String((msg as { sender_id?: string | number; sender?: string | number }).sender_id ?? msg.sender);
              const isSender = rawSenderId === String(myProfile.id);
              const displayName = isSender ? 'You' : (msg as { sender_name?: string }).sender_name ?? '';

              return (
                <View
                  key={String((msg as { id?: string | number }).id ?? msg.timestamp)}
                  accessible
                  accessibilityLabel={msg.content}
                  style={{
                    alignSelf: isSender ? 'flex-end' : 'flex-start',
                    marginBottom: 12,
                    maxWidth: '80%',
                  }}
                >
                  <View style={[tw`p-3 rounded-lg`, { backgroundColor: isSender ? '#ec4899' : '#374151' }]}>
                    {!isSender && !!displayName && (
                      <Text style={tw`text-[11px] font-semibold text-gray-300 mb-0.5`}>{displayName}</Text>
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

        {/* Composer */}
        {activeChat && (
          <View style={tw`flex-row items-center p-4 bg-gray-800 border-t border-gray-700`}>
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
            <TouchableOpacity accessibilityLabel="Insert emoji" accessibilityHint="Open emoji picker" style={tw`px-3`}>
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
