// packages/shared/api/accountApi.ts
import { Platform } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";


export const setCookieConsent = async (consent: boolean): Promise<void> => {
  if (Platform.OS === 'web') {
    // Set cookie for 150 days
    const maxAge = 150 * 24 * 60 * 60;
    document.cookie = `funzaSasaCookieConsent=${consent}; max-age=${maxAge}; path=/`;
  } else {
    await AsyncStorage.setItem('funzaSasaCookieConsent', JSON.stringify(consent));
  }
};

export const getCookieConsent = async (): Promise<boolean | null> => {
  if (Platform.OS === 'web') {
    const match = document.cookie.match(new RegExp('(^| )funzaSasaCookieConsent=([^;]+)'));
    return match ? match[2] === 'true' : null;
  } else {
    const value = await AsyncStorage.getItem('funzaSasaCookieConsent');
    return value !== null ? JSON.parse(value) : null;
  }
};
