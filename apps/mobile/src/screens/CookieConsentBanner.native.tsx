// packages/mobile/components/CookieConsentBannerMobile.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';

const COOKIE_CONSENT_KEY = 'funzaSasaCookieConsent';

const CookieConsentBannerMobile = () => {
  const [visible, setVisible] = useState(false);

  // Check for existing consent on mount.
  useEffect(() => {
    const checkConsent = async () => {
      try {
        const consent = await AsyncStorage.getItem(COOKIE_CONSENT_KEY);
        if (!consent) {
          setVisible(true);
        }
      } catch (error) {
        console.error('Error checking cookie consent:', error);
        setVisible(true);
      }
    };
    checkConsent();
  }, []);

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
      setVisible(false);
    } catch (error) {
      console.error('Error saving consent:', error);
    }
  };

  const handleDecline = async () => {
    try {
      await AsyncStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
      setVisible(false);
    } catch (error) {
      console.error('Error saving consent:', error);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={tw`absolute bottom-0 left-0 right-0 bg-[#2A1E5C] p-4`}>
      <Text style={tw`text-white text-center text-sm`}>
        We use cookies to enhance your experience.{' '}
        <Text
          style={tw`underline text-[#FF70A6]`}
          onPress={() => Linking.openURL('https://yourdomain.com/cookie-policy')}
        >
          Learn more
        </Text>
      </Text>
      <View style={tw`flex-row justify-center mt-4`}>
        <TouchableOpacity onPress={handleAccept} style={tw`bg-[#A259FF] px-4 py-2 mr-2 rounded`}>
          <Text style={tw`text-white text-base`}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDecline} style={tw`bg-[#8B30FF] px-4 py-2 ml-2 rounded`}>
          <Text style={tw`text-white text-base`}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CookieConsentBannerMobile;
