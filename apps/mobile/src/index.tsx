// apps/mobile/src/index.tsx

// ——— Imports ———
import * as Sentry from '@sentry/react-native';
import axios from 'axios';
import { Alert, LogBox } from 'react-native';
import * as Font from 'expo-font';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import Constants from 'expo-constants';
import App from './App';
import { ShopContextProvider, ChatProvider } from '@mytutorapp/shared/context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { storage } from '../utils/storage';

// ——— Sentry Initialization ———
Sentry.init({
  dsn: 'https://0578b08420c98fb776dccf7e7686a07b@o4509764733632512.ingest.us.sentry.io/4509764974608384',
  debug: __DEV__,
});

// ─── Strip out warnings, logs & alerts in production ───
if (!__DEV__) {
  LogBox.ignoreAllLogs();
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};
  Alert.alert = () => {};
}

// ─── Axios Request Interceptor ───
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
    const resp = error.response;
    if (!resp) {
      console.error('🚨 Axios Response Error (no response):', error.message);
      if (!__DEV__) {
        Sentry.captureException(error); // Send to Sentry only in production
      }
      return Promise.reject(error);
    }
    const failedUrl: string = resp.config?.url || '';
    const statusCode: number = resp.status;

    if (
      (statusCode === 404 || statusCode === 500) &&
      /\/api\/profiles\/\d+\/certification/.test(failedUrl)
    ) {
      console.log(`🔇 Suppressed ${statusCode} from cert endpoint: ${failedUrl}`);
      return Promise.reject(error);
    }
    if (statusCode === 429) {
      console.log(`🔇 Rate limit (429) on: ${failedUrl}`);
      return Promise.reject(error);
    }
    console.error('🚨 Axios Response Error:', {
      url: failedUrl,
      status: statusCode,
      data: resp.data,
    });

    // Capture unexpected network errors to Sentry ONLY in production
    if (!__DEV__) {
      Sentry.captureException(error);
    }

    Alert.alert('Network Error', resp.data?.message || error.message || 'Unknown error');
    return Promise.reject(error);
  }
);


// ——— Combine extras and runtime config ———
interface AppExtra {
  EXPO_PUBLIC_BACKEND_URL?: string;
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: string;
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: string;
  EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: string;
}

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

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: runtimeExtra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: runtimeExtra.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: ['email', 'profile'],
  offlineAccess: true,
});

// Backend URL fallback
const backendUrl =
  runtimeExtra.EXPO_PUBLIC_BACKEND_URL ?? 'http://192.168.137.1:4000';
console.log('🔗 Using backend URL:', backendUrl);

// React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

queryClient.getQueryCache().subscribe((event: any) => {
  if (event.type === 'updated') {
    const state = event.query.state;
    if (state.status === 'error') {
      console.log('🔇 Silenced React Query error:', state.error);
    }
  }
});

// ——— Root Component with Font Loading ———
const Root = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      await Font.loadAsync({
        ...FontAwesome.font,
        ...FontAwesome5.font,
      });
      setFontsLoaded(true);
    })();
  }, []);

  if (!fontsLoaded) return null; // or return a loading spinner

  return (
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
};

registerRootComponent(Root);
