// /apps/mobile/src/screens/CookieConsentBanner.native.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useCertificationSettings } from '@shared/hooks/useCookieConsent';
import { useSafeNavigate } from "@shared/utils/navigation";

const CookieConsentBanner = () => {
  const { acceptCookies, declineCookies } = useCertificationSettings();
   const navigation = useSafeNavigate();
  return (
    <View className="absolute bottom-0 w-full bg-[#2A1E5C] p-4 flex-row items-center justify-between">
      <Text className="text-white flex-1">
        We use cookies to enhance your experience.
      </Text>
      <TouchableOpacity
       onPress={() => {
        navigation('CookiePolicy');
      }}
      
      >
        <Text className="underline text-[#FF70A6]">Learn more</Text>
      </TouchableOpacity>
      <View className="flex-row ml-4">
        <TouchableOpacity
          className="bg-[#A259FF] px-3 py-1 rounded mr-2"
          onPress={acceptCookies}
        >
          <Text className="text-white text-sm">Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-[#8B30FF] px-3 py-1 rounded"
          onPress={declineCookies}
        >
          <Text className="text-white text-sm">Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CookieConsentBanner;
