import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import tw from '../../tailwind';

const FooterNative: React.FC = () => (
  <View style={tw`bg-gray-900 py-8 px-6`}>
    {/* Top Section */}
    <View style={tw`flex-col items-center border-b border-gray-700 pb-6 mb-6`}>
      <View style={tw`mb-4`}>
        <Text style={tw`text-lg font-semibold text-gray-300 text-center`}>
          Become a Tutor!
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL('#')}>
          <Text style={tw`text-softPink text-center underline`}>
            Join <Text style={tw`font-bold`}>Funzasasa Tutors</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View style={tw`mb-4`}>
        <Text style={tw`text-lg font-semibold text-gray-300 text-center`}>
          Partner with Us!
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL('#')}>
          <Text style={tw`text-softPink text-center underline`}>
            Funzasasa<Text style={tw`font-bold`}> PARTNERS</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View style={tw`mb-4`}>
        <Text style={tw`text-lg font-semibold text-gray-300 text-center`}>
          Need Assistance?
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL('#')}>
          <Text style={tw`text-softPink text-center underline`}>
            FAQ / Contact Support
          </Text>
        </TouchableOpacity>
      </View>

      {/* Social Links */}
      <View style={tw`flex-row mt-4`}>
        <TouchableOpacity onPress={() => Linking.openURL('#')} style={tw`mr-4`}>
          <Text style={tw`text-white text-xl`}>Facebook</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('#')}>
          <Text style={tw`text-white text-xl`}>Telegram</Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* Middle Section */}
    <View style={tw`border-b border-gray-700 pb-6 mb-6`}>
      <Text style={tw`text-sm text-gray-400 text-center mb-4`}>
        Support | FAQ | Partner with Us | Report Issues
      </Text>
      <Text style={tw`text-xs text-gray-400 text-center mt-4`}>
        Address: 42 Riverside Drive, Nairobi, Kenya{'\n'}
        Email: support@funzasasa.co.ke{'\n'}
        Phone: +254 720423764
      </Text>
    </View>

    {/* Bottom Links */}
    <View style={tw`items-center mb-6`}>
      <TouchableOpacity onPress={() => Linking.openURL('#')} style={tw`mb-2`}>
        <Text style={tw`text-xs text-gray-500 underline`}>Privacy Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL('#')} style={tw`mb-2`}>
        <Text style={tw`text-xs text-gray-500 underline`}>Terms of Service</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL('#')} style={tw`mb-2`}>
        <Text style={tw`text-xs text-gray-500 underline`}>Anti-Spam Policy</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL('#')}>
        <Text style={tw`text-xs text-gray-500 underline`}>Complaints & Feedback</Text>
      </TouchableOpacity>
    </View>

    {/* Bottom Text Section */}
    <View style={tw`mt-6`}>
      <Text style={tw`text-sm font-semibold text-gray-400 text-center mb-2`}>
        EXPERIENCE LIVE TUTORING ONLINE
      </Text>
      <Text style={tw`text-xs text-gray-500 text-center mb-2`}>
        Connecting with skilled tutors is easy on funzasasa.co.ke; use any device to join a live
        session for personalized learning.
      </Text>
      <Text style={tw`text-xs text-gray-500 text-center mb-2`}>
        HOW DOES LIVE TUTORING WORK?
      </Text>
      <Text style={tw`text-xs text-gray-500 text-center`}>
        Just book a session with your preferred tutor, join the online Zoom meeting room, and enjoy
        real-time guidance.
      </Text>
    </View>
  </View>
);

export default FooterNative;
