// MUST be first
import 'react-native-gesture-handler';

import axios from 'axios';
import { Alert, LogBox } from 'react-native';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import App from './App';
import { ShopContextProvider, ChatProvider } from '@mytutorapp/shared/context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { storage } from '../utils/storage';
import { queryClient } from '@mytutorapp/shared/utils/queryClient'; // shared singleton

// expose for any stray global reads (temporary guard)
(globalThis as any).queryClient = queryClient;

// ─── Strip warnings & logs in prod ───
if (!__DEV__) {
  LogBox.ignoreAllLogs();
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};
}

type AppExtra = {
  EXPO_PUBLIC_BACKEND_URL?: string;
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?: string;
};

const getExtra = (): AppExtra => {
  const cfg = (Constants as Record<string, unknown>).expoConfig as { extra?: unknown } | undefined;
  const man = (Constants as Record<string, unknown>).manifest as { extra?: unknown } | undefined;
  const raw = (cfg?.extra ?? man?.extra ?? {}) as Record<string, unknown>;
  return {
    EXPO_PUBLIC_BACKEND_URL: String(raw.EXPO_PUBLIC_BACKEND_URL || '') || undefined,
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: String(raw.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '') || undefined,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: String(raw.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '') || undefined,
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: String(raw.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '') || undefined,
  };
};

const runtimeExtra = getExtra();

(['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID','EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID','EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'] as const)
  .forEach((key) => { if (!runtimeExtra[key]) console.warn(`⚠️ ${key} is not defined in app.config.js extra!`); });

GoogleSignin.configure({
  webClientId: runtimeExtra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: runtimeExtra.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: ['email', 'profile'],
  offlineAccess: true,
});

const backendUrl = runtimeExtra.EXPO_PUBLIC_BACKEND_URL ?? 'http://10.111.77.176:4000';
console.log('🔗 Using backend URL:', backendUrl);

// Axios interceptors …
axios.interceptors.request.use(/* unchanged */);
axios.interceptors.response.use(/* unchanged */);

// Optional: silence query errors globally
queryClient.getQueryCache().subscribe((event: any) => {
  if (event.type === 'updated') {
    const state = event.query.state;
    if (state.status === 'error') {
      console.log('🔇 Silenced React Query error:', state.error);
    }
  }
});

const Root = () => (
  <SafeAreaProvider>
    <NavigationContainer>
      <QueryClientProvider client={queryClient}>
        <ShopContextProvider backendUrl={backendUrl} storage={storage}>
          <ChatProvider>
            <App />
          </ChatProvider>
        </ShopContextProvider>
      </QueryClientProvider>
    </NavigationContainer>
  </SafeAreaProvider>
);

registerRootComponent(Root);
