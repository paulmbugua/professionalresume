import React, { useState, FC } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import tw from '../../tailwind';

type RootStackParamList = {
  CookiePolicy: undefined;
  // Add other routes if needed
};

const CookieConsentBannerNative: FC = () => {
  const [visible, setVisible] = useState(true);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  if (!visible) return null;

  return (
    <View style={tw`absolute bottom-0 w-full`}>
      <View style={tw`p-4 bg-[#2A1E5C]`}>
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
            onPress={() => setVisible(false)}
            style={tw`px-4 py-2 rounded mr-2 bg-[#8B30FF]`}
          >
            <Text style={tw`text-white text-[14px]`}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setVisible(false)}
            style={tw`px-4 py-2 rounded bg-[#A259FF]`}
          >
            <Text style={tw`text-white text-[14px]`}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default CookieConsentBannerNative;
