// /apps/mobile/src/screens/Messages.native.tsx
import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useMessages } from '@shared/hooks/useMessages';
import { useSafeNavigate } from '@shared/utils/navigation';
import tw from 'twrnc';
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faPaperPlane, faBars, faTimes, faHome } from "@fortawesome/free-solid-svg-icons";
import { library } from "@fortawesome/fontawesome-svg-core";
library.add(faPaperPlane, faBars, faTimes, faHome);

// Define a Message interface if needed
interface Message {
  id: string;
  sender_id: string;
  sender_name?: string;
  content: string;
  created_at: string;
  unread: boolean;
}

const MessagesScreen = () => {
  const navigate = useSafeNavigate();
  const {
    activeChat,
    setActiveChat,
    newMessage,
    setNewMessage,
    isSidebarOpen,
    setSidebarOpen,
    handleScroll,
    handleSendMessage,
    openChat,
    chats,
    myProfile,
    // If messageContainerRef is provided by useMessages,
    // ensure it's correctly typed there. Otherwise, define it locally:
  } = useMessages();

  // If not provided by your hook, you can define it here:
  const localScrollViewRef = useRef<ScrollView>(null);

  if (!myProfile) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <Text style={tw`text-white`}>Loading...</Text>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-900 relative`}>
      {/* Home Icon */}
      <TouchableOpacity
        onPress={() => navigate('Home')}
        style={tw`absolute top-4 left-1/2 transform -translate-x-1/2 z-50`}
      >
        <FontAwesomeIcon icon={faHome} style={tw`text-gray-400`} size={30} />
      </TouchableOpacity>

      {/* Sidebar Modal for Conversations */}
      <Modal visible={isSidebarOpen} animationType="slide" transparent>
        <View style={tw`flex-1 bg-gray-800 p-4`}>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <Text style={tw`text-2xl font-bold text-pink-500`}>Chats</Text>
            <TouchableOpacity onPress={() => setSidebarOpen(false)}>
              <FontAwesomeIcon icon={faTimes} style={tw`text-gray-400`} size={24} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {chats.length > 0 ? (
              chats.map((chat, index) => (
                <TouchableOpacity
                  key={`${chat.recipientId}-${index}`}
                  onPress={() => openChat(chat)}
                  style={tw`p-3 rounded-lg mb-4 ${
                    chat.messages?.some(
                      (msg: Message) =>
                        msg.unread && msg.sender_id !== myProfile.id
                    )
                      ? 'bg-gray-700'
                      : 'bg-gray-800'
                  }`}
                >
                  <View style={tw`flex-row items-center`}>
                    <Image
                      source={{
                        uri:
                          chat.avatar ||
                          'https://example.com/default-avatar.png',
                      }}
                      style={tw`w-10 h-10 rounded-full border-2 border-pink-500`}
                    />
                    <View style={tw`ml-3 flex-1`}>
                      <Text style={tw`font-semibold text-pink-400`}>
                        {chat.user || chat.recipientId}
                      </Text>
                      <Text style={tw`text-sm text-gray-400`} numberOfLines={1}>
                        {chat.lastMessage || 'Start a conversation'}
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
      </Modal>

      {/* Toggle Sidebar Button */}
      <TouchableOpacity
        onPress={() => setSidebarOpen(true)}
        style={tw`absolute top-4 left-4 z-50 bg-gray-800 p-2 rounded-lg`}
      >
        <FontAwesomeIcon icon={faBars} style={tw`text-gray-400`} size={24} />
      </TouchableOpacity>

      {/* Main Chat Area */}
      <View style={tw`flex-1`}>
        <View style={tw`flex-row items-center justify-between p-4 bg-gray-800 border-b border-gray-700`}>
          {activeChat ? (
            <View style={tw`flex-row items-center`}>
              <Image
                source={{
                  uri:
                    activeChat.avatar ||
                    'https://example.com/default-avatar.png',
                }}
                style={tw`w-8 h-8 rounded-full`}
              />
              <Text style={tw`ml-3 text-lg font-semibold text-pink-400`}>
                {activeChat.user || activeChat.recipientId}
              </Text>
            </View>
          ) : (
            <Text style={tw`text-lg font-semibold text-gray-400`}>Your Messages</Text>
          )}
          {activeChat && (
            <TouchableOpacity onPress={() => setActiveChat(null)}>
              <FontAwesomeIcon icon={faTimes} style={tw`text-gray-400`} size={24} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          ref={localScrollViewRef}
          onScroll={handleScroll}
          style={tw`flex-1 p-4 bg-gray-800`}
          contentContainerStyle={tw`space-y-3`}
        >
          {activeChat ? (
            activeChat.messages
              ?.slice()
              .sort(
                (a, b) =>
                  new Date(a.created_at).getTime() -
                  new Date(b.created_at).getTime()
              )
              .map((msg: Message, index: number) => {
                const isSender = msg.sender_id === myProfile.id;
                const displayName = isSender ? 'You' : (msg.sender_name || '');
                return (
                  <View
                    key={index}
                    style={tw`flex ${isSender ? 'justify-end' : 'justify-start'}`}
                  >
                    <View
                      style={tw`px-4 py-2 rounded-lg max-w-xs shadow-lg mb-1 ${
                        isSender ? 'bg-pink-500' : 'bg-gray-700'
                      }`}
                    >
                      <Text style={tw`text-sm ${isSender ? 'text-white' : 'text-gray-200'}`}>
                        {isSender ? '' : displayName ? displayName + ': ' : ''}{msg.content}
                      </Text>
                    </View>
                  </View>
                );
              })
          ) : (
            <View style={tw`flex-1 justify-center items-center`}>
              <Text style={tw`text-gray-500`}>Select a chat to view messages.</Text>
            </View>
          )}
        </ScrollView>
        {activeChat && (
          <View style={tw`p-4 bg-gray-800 flex-row items-center border-t border-gray-700`}>
            <TextInput
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={setNewMessage}
              style={tw`flex-1 p-2 rounded-lg bg-gray-900 border border-gray-600 text-gray-200`}
              multiline
            />
            <TouchableOpacity onPress={handleSendMessage} style={tw`ml-2`}>
              <FontAwesomeIcon icon={faPaperPlane} style={tw`text-pink-500`} size={24} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default MessagesScreen;
