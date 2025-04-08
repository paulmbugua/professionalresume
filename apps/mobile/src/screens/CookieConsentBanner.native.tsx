import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { NavigationProp, useNavigation } from '@react-navigation/native';

type RootStackParamList = {
  CookiePolicy: undefined;
  // Add other routes if needed
};

const CookieConsentBannerNative = () => {
  const [visible, setVisible] = useState(true);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  if (!visible) return null;

  return (
    <View style={tw`absolute bottom-0 w-full`}>
      <View style={[tw`p-4`, { backgroundColor: '#2A1E5C' }]}>
        <Text style={tw`text-white text-base mb-2`}>
          We use cookies to enhance your experience.{' '}
          <Text
            style={tw`underline text-[#FF70A6]`}
            onPress={() => navigation.navigate('CookiePolicy')}
          >
            Learn more
          </Text>
        </Text>
        <View style={tw`flex-row justify-end`}>
          <TouchableOpacity
            style={[tw`px-4 py-2 rounded mr-2`, { backgroundColor: '#8B30FF' }]}
            onPress={() => setVisible(false)}
          >
            <Text style={tw`text-white text-[14px]`}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[tw`px-4 py-2 rounded`, { backgroundColor: '#A259FF' }]}
            onPress={() => setVisible(false)}
          >
            <Text style={tw`text-white text-[14px]`}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default CookieConsentBannerNative;
