import { registerRootComponent } from "expo";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import App from "./App";
import ShopContextProvider from "@shared/context/ShopContext";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

// Configure Google Sign-In before registering root component
GoogleSignin.configure({
  webClientId: "309635970564-o2uvl6l8ko82gsapr45mmpogslamhleo.apps.googleusercontent.com",
   offlineAccess: true,
} as any);

const Root = () => (
  <NavigationContainer>
    <ShopContextProvider>
      <App />
    </ShopContextProvider>
  </NavigationContainer>
);

registerRootComponent(Root);
