// /apps/mobile/src/screens/Footer.native.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';

const Footer = () => {
  // A simple handler for link presses (replace with navigation or Linking as needed)
  const handlePress = (url: string) => {
    Linking.openURL(url).catch(console.error);
  };

  return (
    <View className="bg-gray-900 py-8 px-6">
      {/* Top Section */}
      <View className="flex flex-col space-y-6 border-b border-gray-700 pb-6 mb-6">
        <View className="items-center">
          <Text className="text-lg font-semibold text-white">Become a Tutor!</Text>
          <TouchableOpacity onPress={() => handlePress('#')}>
            <Text className="text-softPink hover:underline">
              Join <Text className="font-bold">Funazasasa Tutors</Text>
            </Text>
          </TouchableOpacity>
        </View>
        
        <View className="items-center">
          <Text className="text-lg font-semibold text-white">Partner with Us!</Text>
          <TouchableOpacity onPress={() => handlePress('#')}>
            <Text className="text-softPink hover:underline">
              Funazasasa <Text className="font-bold">PARTNERS</Text>
            </Text>
          </TouchableOpacity>
        </View>
        
        <View className="items-center">
          <Text className="text-lg font-semibold text-white">Need Assistance?</Text>
          <TouchableOpacity onPress={() => handlePress('#')}>
            <Text className="text-softPink hover:underline">FAQ / Contact Support</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row space-x-4 mt-4">
          <TouchableOpacity onPress={() => handlePress('#')}>
            <Text className="text-white text-xl">Facebook</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handlePress('#')}>
            <Text className="text-white text-xl">Telegram</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Middle Section */}
      <View className="border-b border-gray-700 pb-6 mb-6">
        <Text className="text-sm text-gray-400 text-center mb-4">
          Support | FAQ | Partner with Us | Report Issues
        </Text>
        <Text className="text-xs text-gray-400 text-center">
          Address: 42 Riverside Drive, Nairobi, Kenya{'\n'}
          Email: support@funzasasa.co.ke{'\n'}
          Phone: +254 720423764
        </Text>
      </View>

      {/* Bottom Links */}
      <View className="flex flex-col items-center space-y-2 mb-6">
        <TouchableOpacity onPress={() => handlePress('#')}>
          <Text className="text-xs text-gray-500 hover:text-softPink">Privacy Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePress('#')}>
          <Text className="text-xs text-gray-500 hover:text-softPink">Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePress('#')}>
          <Text className="text-xs text-gray-500 hover:text-softPink">Anti-Spam Policy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handlePress('#')}>
          <Text className="text-xs text-gray-500 hover:text-softPink">Complaints & Feedback</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Text Section */}
      <View className="space-y-2">
        <Text className="text-sm font-semibold text-gray-400 text-center">
          EXPERIENCE LIVE TUTORING ONLINE
        </Text>
        <Text className="text-xs text-gray-500 text-center">
          Connecting with skilled tutors is easy on funzasasa.co.ke; use any device to join a live session for personalized learning.
        </Text>
        <Text className="text-xs text-gray-500 text-center">HOW DOES LIVE TUTORING WORK?</Text>
        <Text className="text-xs text-gray-500 text-center">
          Just book a session with your preferred tutor, join the online Zoom meeting room, and enjoy real-time guidance.
        </Text>
      </View>
    </View>
  );
};

export default Footer;
