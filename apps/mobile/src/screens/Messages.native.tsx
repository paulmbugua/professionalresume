import { useEffect, useRef } from 'react';
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
import tw from '../../tailwind'; // Import the tw instance
import chat from '../../assets/chat.png';
import {
  Conversation,
  ChatMessage as SharedChatMessage,
} from '@mytutorapp/shared/types/ShopContextTypes';

interface DisplayMessage {
  sender_id: string | number;
  sender_name: string;
  content: string;
  unread: boolean;
  created_at: string;
}

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

  const messageInputRef = useRef<TextInput>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    if (offsetY < 100) {
      loadMoreMessages();
    }
  };

  useEffect(() => {
    const { studentId } = route.params;
    if (studentId && !activeChat && chats.length > 0) {
      const chatToOpen = chats.find(
        (chatItem: Conversation) => String(chatItem.recipientId) === String(studentId)
      );
      if (chatToOpen) {
        openChat(chatToOpen);
      }
    }
  }, [route.params, chats, activeChat, openChat]);

  useEffect(() => {
    if (activeChat && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [activeChat]);

  if (!myProfile) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <Text style={tw`text-white`}>Loading...</Text>
      </View>
    );
  }

  const convertedMessages: DisplayMessage[] =
    activeChat?.messages?.map((msg: SharedChatMessage) => ({
      sender_id: msg.sender,
      sender_name: msg.sender_name || '',
      content: msg.content,
      unread: msg.unread,
      created_at: msg.timestamp || new Date().toISOString(),
    })) || [];

  return (
    <View style={tw`flex-1 bg-gray-900 relative`}>
      {/* Home Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Home')}
        style={tw`absolute top-4 left-1/2 transform -translate-x-1/2 z-30`}
      >
        <FontAwesome name="home" size={24} color="#A0AEC0" style={tw`opacity-80`} />
      </TouchableOpacity>

      {/* Sidebar */}
      {isSidebarOpen && (
        <View style={tw`absolute inset-y-0 left-0 z-20 w-72 bg-gray-800 p-4 border-r border-gray-700`}>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <Text style={tw`text-2xl font-bold text-pink-500`}>Chats</Text>
            <TouchableOpacity onPress={() => setSidebarOpen(false)}>
              <FontAwesome name="times" size={24} color="#A0AEC0" />
            </TouchableOpacity>
          </View>
          <ScrollView style={tw`gap-y-4`}>
            {chats.length > 0 ? (
              chats.map((chatItem: Conversation, index: number) => (
                <TouchableOpacity
                  key={`${chatItem.recipientId}-${index}`}
                  onPress={() => openChat(chatItem)}
                >
                  <View style={tw`flex-row items-center gap-x-3`}>
                    <Image
                      source={
                        myProfile.role === 'tutor'
                          ? chat
                          : chatItem.avatar
                            ? { uri: chatItem.avatar }
                            : chat
                      }
                      style={tw`w-10 h-10 rounded-full border-2 border-pink-500`}
                    />
                    <View style={tw`flex-1`}>
                      <Text style={tw`font-semibold text-pink-400`}>
                        {chatItem.user || chatItem.recipientId}
                      </Text>
                      <Text style={tw`text-sm text-gray-400`} numberOfLines={1}>
                        {chatItem.lastMessage || 'Start a conversation'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={tw`text-center text-gray-300`}>No chats available</Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Chat Area */}
      <View style={tw`flex-1 flex-col bg-gray-900`}>
        <View style={tw`flex-row items-center justify-between p-4 bg-gray-800 border-b border-gray-700`}>
          <TouchableOpacity onPress={() => setSidebarOpen(true)} style={tw`md:hidden`}>
            <FontAwesome name="bars" size={24} color="#A0AEC0" />
          </TouchableOpacity>
          {activeChat ? (
            <View style={tw`absolute left-16 md:left-20 flex-row items-center gap-x-3`}>
              <Image
                source={
                  myProfile.role === 'tutor'
                    ? chat
                    : activeChat.avatar
                      ? { uri: activeChat.avatar }
                      : chat
                }
                style={tw`w-8 h-8 rounded-full`}
              />
              <Text style={tw`text-lg font-semibold text-pink-400`}>
                {activeChat.user || activeChat.recipientId}
              </Text>
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
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={tw`flex-1 p-4 bg-gray-800 gap-y-3`}
        >
          {activeChat ? (
            <View style={tw`gap-y-3`}>
              {convertedMessages
                .slice()
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                .map((msg: DisplayMessage, index: number) => {
                  const isSender = String(msg.sender_id) === String(myProfile.id);
                  const displayName = isSender ? 'You' : msg.sender_name || '';
                  return (
                    <View key={index}>
                      <View>
                        <Text style={tw`text-sm`}>
                          {isSender ? '' : displayName ? `${displayName}: ` : ''}
                          {msg.content}
                        </Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          ) : (
            <View style={tw`flex-1 items-center justify-center`}>
              <Text style={tw`text-gray-500`}>Select a chat to view messages.</Text>
            </View>
          )}
        </ScrollView>

        {activeChat && (
          <View style={tw`p-4 bg-gray-800 flex-row items-center gap-x-3 border-t border-gray-700`}>
            <TextInput
              ref={messageInputRef}
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              style={tw`flex-1 p-2 rounded-lg bg-gray-900 border border-gray-600 text-gray-200`}
              multiline
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity>
              <FontAwesome name="smile-o" size={24} color="#A0AEC0" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSendMessage}
              style={tw`bg-pink-500 px-4 py-2 rounded-lg flex-row items-center shadow-lg`}
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