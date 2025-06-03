// apps/mobile/src/index.tsx

// ——— Add these imports & interceptors at the top ———
import axios from 'axios';
import { Alert } from 'react-native';

// Log every outgoing request
axios.interceptors.request.use(
  request => {
    console.log('👉 Axios Request:', {
      url: request.url,
      method: request.method,
      headers: request.headers,
      data: request.data,
    });
    return request;
  },
  error => {
    console.error('🚨 Axios Request Error:', error);
    return Promise.reject(error);
  }
);

// Log every incoming response
axios.interceptors.response.use(
  response => {
    console.log('✅ Axios Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    });
    return response;
  },
  error => {
    console.error('🚨 Axios Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    Alert.alert(
      'Network Error',
      error.response?.data?.message ||
        error.message ||
        'Unknown error'
    );
    return Promise.reject(error);
  }
);

// ——— The rest of your entrypoint ———
import 'react-native-gesture-handler';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import Constants from 'expo-constants';
import App from './App';
import { ShopContextProvider, ChatProvider } from '@mytutorapp/shared/context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { storage } from '../utils/storage';

interface AppExtra {
  EXPO_PUBLIC_BACKEND_URL?: string;
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: string;
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: string;
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: string;
}

// Combine expoConfig.extra (EAS/custom) with manifest.extra (Expo Go)
const runtimeExtra = (
  (Constants.expoConfig as any)?.extra ??
  (Constants.manifest as any)?.extra ??
  {}
) as AppExtra;

// Warn if any client ID is missing
[
  'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',
  'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID',
].forEach(key => {
  if (!(runtimeExtra as any)[key]) {
    console.warn(`⚠️ ${key} is not defined in app.config.js extra!`);
  }
});

// Configure Google Sign-In once with all IDs
GoogleSignin.configure({
  webClientId: runtimeExtra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: runtimeExtra.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: ['email', 'profile'],
  offlineAccess: true,
});

// Backend URL fallback
const backendUrl =
  runtimeExtra.EXPO_PUBLIC_BACKEND_URL ?? 'http://192.168.247.47:4000';
console.log('🔗 Using backend URL:', backendUrl);

// React Query client with defaults (no onError here)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 minutes
      retry: 2,                    // retry twice on failure
      refetchOnWindowFocus: false, // don't refetch on focus
    },
  },
});

// Optional: globally silence all query errors
queryClient.getQueryCache().subscribe((event: any) => {
  if (event.type === 'updated') {
    const state = event.query.state;
    if (state.status === 'error') {
      console.log('🔇 Silenced React Query error:', state.error);
    }
  }
});

const Root = () => (
  <NavigationContainer>
    <QueryClientProvider client={queryClient}>
      <ShopContextProvider backendUrl={backendUrl} storage={storage}>
        <ChatProvider>
          <App />
        </ChatProvider>
      </ShopContextProvider>
    </QueryClientProvider>
  </NavigationContainer>
);

registerRootComponent(Root);
