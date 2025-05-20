// apps/mobile/src/index.tsx

import 'react-native-gesture-handler';
import React from 'react';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import Constants from 'expo-constants';
import App from './App';
import { ShopContextProvider, ChatProvider } from '@mytutorapp/shared/context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { storage } from '../utils/storage';

interface AppExtra {
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: string;
  EXPO_PUBLIC_BACKEND_URL?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

if (!extra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
  console.warn('⚠️ No EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID found in app.config.js extra!');
}

GoogleSignin.configure({
  webClientId: extra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
});

const backendUrl = extra.EXPO_PUBLIC_BACKEND_URL ?? 'http://192.168.68.47:4000';

console.log('🔗 Using backend URL:', backendUrl);

const Root = () => (
  <NavigationContainer>
    <ShopContextProvider backendUrl={backendUrl} storage={storage}>
      <ChatProvider>
        <App />
      </ChatProvider>
    </ShopContextProvider>
  </NavigationContainer>
);

registerRootComponent(Root);
