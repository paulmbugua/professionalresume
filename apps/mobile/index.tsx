// index.tsx
import { registerRootComponent } from 'expo';
import React from 'react';
import App from './App';
import ShopContextProvider from '@shared/context/ShopContext';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In before registering root component
GoogleSignin.configure({
  webClientId: "309635970564-j3466abkbgp3giep99aueh3d4pdhkus3.apps.googleusercontent.com",
  serverClientId: "309635970564-j3466abkbgp3giep99aueh3d4pdhkus3.apps.googleusercontent.com",
  offlineAccess: true,
} as any);

const Root = () => (
  <ShopContextProvider>
    <App />
  </ShopContextProvider>
);

registerRootComponent(Root);
