// apps/mobile/src/index.tsx

// MUST be first
import 'react-native-gesture-handler';

import axios from 'axios';
import React from 'react';
import { Alert, LogBox, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerRootComponent } from 'expo';
import Constants from 'expo-constants';

import { QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer, DefaultTheme as NavLight, DarkTheme as NavDark } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

import App from './App';
import tw from '../tailwind'; // NOTE: '../tailwind' (not './tailwind')

// Contexts / hooks shared across apps
import { ShopContextProvider, ChatProvider } from '@mytutorapp/shared/context';
import { ThemeProvider, useThemeProvider } from '@mytutorapp/shared/hooks';
import { registerThemeApplier } from '@mytutorapp/shared/hooks/useTheme';
import { storage } from '../utils/storage';
import { queryClient } from '@mytutorapp/shared/utils/queryClient';

/* ──────────────────────────────────────────────────────────
   Global dev/production logging
────────────────────────────────────────────────────────── */
if (!__DEV__) {
  LogBox.ignoreAllLogs();
  // Silence console in prod (keep if you really want a quiet log)
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
console.log('🔗 Using backend URL:', backendUrl);

// Safe pass-through interceptors (replace with your real ones if needed)
axios.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Example central error hook (optional)
    if (__DEV__) {
      console.warn('[Axios error]', error?.message ?? error);
    }
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
   Theme persistence for RN (AsyncStorage adapter)
────────────────────────────────────────────────────────── */
const rnThemeStorage = {
  read: async (key: string) => {
    const v = await AsyncStorage.getItem(key);
    return v === 'dark' ? 'dark' : 'light';
  },
  write: async (key: string, value: 'light' | 'dark') => {
    await AsyncStorage.setItem(key, value);
  },
};

/* ──────────────────────────────────────────────────────────
   Theme → twrnc + StatusBar bridge
   - Register a theme "applier" so shared ThemeProvider notifies RN.
   - Keep a tiny ThemeBridge to control StatusBar only.
────────────────────────────────────────────────────────── */
registerThemeApplier((mode) => (tw as any).setColorScheme?.(mode));

const ThemeBridge: React.FC = () => {
  const { theme } = useThemeProvider();
  return (
    <StatusBar
      translucent
      backgroundColor="transparent"
      barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
    />
  );
};

/* ──────────────────────────────────────────────────────────
   Navigation theming wrapper
────────────────────────────────────────────────────────── */
const NavShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme } = useThemeProvider();
  return (
    <NavigationContainer theme={theme === 'dark' ? NavDark : NavLight}>
      {children}
    </NavigationContainer>
  );
};

/* ──────────────────────────────────────────────────────────
   Root composition
────────────────────────────────────────────────────────── */
const Root = () => (
  <SafeAreaProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider storage={rnThemeStorage}>
        {/* Applies StatusBar style, twrnc theme handled via registerThemeApplier */}
        <ThemeBridge />
        <ShopContextProvider backendUrl={backendUrl} storage={storage}>
          <ChatProvider>
            <NavShell>
              <App />
            </NavShell>
          </ChatProvider>
        </ShopContextProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </SafeAreaProvider>
);

/* ──────────────────────────────────────────────────────────
   Mount
────────────────────────────────────────────────────────── */
registerRootComponent(Root);

// Optional: expose for any stray global reads (temporary guard)
(globalThis as any).queryClient = queryClient;
