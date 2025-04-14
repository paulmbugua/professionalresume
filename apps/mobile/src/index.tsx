import 'react-native-gesture-handler';
import { registerRootComponent } from "expo";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import App from "./App";
import { ShopContextProvider } from '@shared/context';
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { storage } from "../utils/storage"; // 👈 import your mobile-specific storage

// Google config
const googleConfig = {
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
  offlineAccess: true,
};

GoogleSignin.configure(googleConfig);
console.log("✅ GoogleSignin configured with client ID:", googleConfig.webClientId);

const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:4000'; 

const Root = () => (
  <NavigationContainer>
    <ShopContextProvider backendUrl={backendUrl} storage={storage}>
      <App />
    </ShopContextProvider>
  </NavigationContainer>
);

registerRootComponent(Root);
