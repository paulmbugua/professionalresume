import { registerRootComponent } from "expo";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import App from "./App";
import ShopContextProvider from "@shared/context/ShopContext";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { storage } from "../utils/storage"; // 👈 import your mobile-specific storage

// Google config
const googleConfig = {
  webClientId: "557799973381-ksp83t2vo6fdqufhm0iie06lnb4e8j8v.apps.googleusercontent.com",
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
