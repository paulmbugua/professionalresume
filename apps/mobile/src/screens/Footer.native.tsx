import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';

const FooterNative: React.FC = () => (
  <View className="bg-gray-900 py-8 px-6">
    {/* Top Section */}
    <View className="flex-col items-center border-b border-gray-700 pb-6 mb-6">
      <View className="mb-4">
        <Text className="text-lg font-semibold text-gray-300 text-center">Become a Tutor!</Text>
        <TouchableOpacity onPress={() => Linking.openURL('#')}>
          <Text className="text-softPink text-center underline">
            Join <Text className="font-bold">Funzasasa Tutors</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mb-4">
        <Text className="text-lg font-semibold text-gray-300 text-center">Partner with Us!</Text>
        <TouchableOpacity onPress={() => Linking.openURL('#')}>
          <Text className="text-softPink text-center underline">
            Funzasasa<Text className="font-bold"> PARTNERS</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View className="mb-4">
        <Text className="text-lg font-semibold text-gray-300 text-center">Need Assistance?</Text>
        <TouchableOpacity onPress={() => Linking.openURL('#')}>
          <Text className="text-softPink text-center underline">FAQ / Contact Support</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row space-x-4 mt-4">
        <TouchableOpacity onPress={() => Linking.openURL('#')}>
          <Text className="text-white text-xl">Facebook</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('#')}>
          <Text className="text-white text-xl">Telegram</Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* Middle Section */}
    <View className="border-b border-gray-700 pb-6 mb-6">
      <Text className="text-sm text-gray-400 text-center mb-4">
        Support | FAQ | Partner with Us | Report Issues
      </Text>
      <Text className="text-xs text-gray-400 text-center mt-4">
        Address: 42 Riverside Drive, Nairobi, Kenya{'\n'}
        Email: support@funzasasa.co.ke{'\n'}
        Phone: +254 720423764
      </Text>
    </View>

    {/* Bottom Links */}
    <View className="flex-col items-center space-y-2 mb-6">
      <TouchableOpacity onPress={() => Linking.openURL('#')}>
        <Text className="text-xs text-gray-500 underline">Privacy Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL('#')}>
        <Text className="text-xs text-gray-500 underline">Terms of Service</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL('#')}>
        <Text className="text-xs text-gray-500 underline">Anti-Spam Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL('#')}>
        <Text className="text-xs text-gray-500 underline">Complaints & Feedback</Text>
      </TouchableOpacity>
    </View>

    {/* Bottom Text Section */}
    <View className="mt-6 space-y-2">
      <Text className="text-sm font-semibold text-gray-400 text-center">
        EXPERIENCE LIVE TUTORING ONLINE
      </Text>
      <Text className="text-xs text-gray-500 text-center">
        Connecting with skilled tutors is easy on funzasasa.co.ke; use any device to join a live
        session for personalized learning.
      </Text>
      <Text className="text-xs text-gray-500 text-center">HOW DOES LIVE TUTORING WORK?</Text>
      <Text className="text-xs text-gray-500 text-center">
        Just book a session with your preferred tutor, join the online Zoom meeting room, and enjoy
        real-time guidance.
      </Text>
    </View>
  </View>
);

export default FooterNative;
