// MUST be first
import 'react-native-gesture-handler';

import axios from 'axios';
import React, { useEffect, useRef } from 'react';
import { LogBox, StatusBar } from 'react-native';
import { registerRootComponent } from 'expo';
import Constants from 'expo-constants';
import { ThemeProvider, useThemePref } from './theme/ThemeContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { GlobalRefreshProvider } from './refresh/GlobalRefreshProvider';
import {
  NavigationContainer,
  DefaultTheme as NavLight,
  DarkTheme as NavDark,
  useNavigationContainerRef,
  CommonActions,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useDeviceContext } from 'twrnc';
import { registerForPushToken, initNotificationListeners } from '../utils/notifications'; // ← fixed path
import App from './App';
import tw from '../tailwind';

import { ShopContextProvider, ChatProvider } from '@mytutorapp/shared/context';
import { storage } from '../utils/storage';
import { queryClient } from '@mytutorapp/shared/utils/queryClient';

/* ──────────────────────────────────────────────────────────
   Global dev/production logging
────────────────────────────────────────────────────────── */
if (!__DEV__) {
  LogBox.ignoreAllLogs();
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};
}

/* ──────────────────────────────────────────────────────────
   Expo extras (runtime-config)
────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────
   Google Sign-In
────────────────────────────────────────────────────────── */
GoogleSignin.configure({
  webClientId: runtimeExtra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: runtimeExtra.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: ['email', 'profile'],
  offlineAccess: true,
});

/* ──────────────────────────────────────────────────────────
   Backend URL + Axios interceptors
────────────────────────────────────────────────────────── */
const backendUrl = runtimeExtra.EXPO_PUBLIC_BACKEND_URL ?? 'http://10.111.77.176:4000';
axios.defaults.baseURL = backendUrl; // ← ensure relative URLs hit your backend
console.log('🔗 Using backend URL:', backendUrl);

axios.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) console.warn('[Axios error]', error?.message ?? error);
    return Promise.reject(error);
  }
);

/* ──────────────────────────────────────────────────────────
   React Query: silence errors globally (optional)
────────────────────────────────────────────────────────── */
queryClient.getQueryCache().subscribe((event: any) => {
  if (event.type === 'updated') {
    const state = event.query.state;
    if (state.status === 'error') {
      console.log('🔇 Silenced React Query error:', state.error);
    }
  }
});

/* ──────────────────────────────────────────────────────────
   Root composition (ThemeProvider only)
────────────────────────────────────────────────────────── */
const RootInner = () => {
  const { resolvedScheme } = useThemePref(); // 'light' | 'dark'
  const navRef = useNavigationContainerRef();

  // ✅ Notifications init INSIDE a component, with deep linking via navRef
  useEffect(() => {
    let cleanup = () => {};

    (async () => {
      const token = await registerForPushToken();
      if (token) {
        try {
          await axios.post('/api/notifications/register', { token });
        } catch (e) {
          if (__DEV__) console.warn('Token register failed', e);
        }
      }

      cleanup = initNotificationListeners({
        onReceive: () => {}, // optional: update in-app badges/toasts
        onRespond: (resp) => {
          const data = resp.notification.request.content.data as any;
          if (data?.screen) {
            navRef.current?.dispatch(
              CommonActions.navigate({
                name: String(data.screen),
                params: data.params ?? undefined,
              })
            );
          }
        },
      });
    })();

    return () => cleanup();
  }, [navRef]);

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={resolvedScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <GlobalRefreshProvider>
        <NavigationContainer ref={navRef} theme={resolvedScheme === 'dark' ? NavDark : NavLight}>
          <App />
        </NavigationContainer>
      </GlobalRefreshProvider>
    </>
  );
};

const Root = () => {
  // Enable twrnc device sizing (vh/vw) + let ThemeProvider control tw.setColorScheme
  useDeviceContext(tw);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ShopContextProvider backendUrl={backendUrl} storage={storage}>
          <ChatProvider>
            <ThemeProvider tw={tw}>
              <RootInner />
            </ThemeProvider>
          </ChatProvider>
        </ShopContextProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
};

/* ──────────────────────────────────────────────────────────
   Mount
────────────────────────────────────────────────────────── */
registerRootComponent(Root);
(globalThis as any).queryClient = queryClient;
