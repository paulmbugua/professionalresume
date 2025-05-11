// apps/mobile/src/index.tsx
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import Constants from 'expo-constants';
import App from './App';
import { ShopContextProvider } from '@mytutorapp/shared/context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { storage } from '../utils/storage';

// Extract your extras in a type-safe way
interface AppExtra {
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: string;
  EXPO_PUBLIC_BACKEND_URL?: string;
}

// `expoConfig` is defined in Expo SDK ≥47
const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

if (!extra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
  console.warn(
    '⚠️ No EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID found in app.config.js extra!'
  );
}

// Configure Google signin
GoogleSignin.configure({
  webClientId: extra.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
});

// Build your backend URL, falling back to your local address
const backendUrl =
  extra.EXPO_PUBLIC_BACKEND_URL ??
  'http://192.168.1.47:4000';

console.log('🔗 Using backend URL:', backendUrl);

const Root = () => (
  <NavigationContainer>
    <ShopContextProvider backendUrl={backendUrl} storage={storage}>
      <App />
    </ShopContextProvider>
  </NavigationContainer>
);

registerRootComponent(Root);
