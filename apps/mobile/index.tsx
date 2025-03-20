import { registerRootComponent } from "expo";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import App from "./App";
import ShopContextProvider from "@shared/context/ShopContext";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

// Create the configuration object
const googleConfig = {
  webClientId: "309635970564-o2uvl6l8ko82gsapr45mmpogslamhleo.apps.googleusercontent.com",
  offlineAccess: true,
};

// Configure Google Sign-In
GoogleSignin.configure(googleConfig);

// Log the client ID to verify it's using the new one
console.log("GoogleSignin configured with client ID:", googleConfig.webClientId);

const Root = () => (
  <NavigationContainer>
    <ShopContextProvider>
      <App />
    </ShopContextProvider>
  </NavigationContainer>
);

registerRootComponent(Root);
