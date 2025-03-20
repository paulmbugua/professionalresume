import { registerRootComponent } from "expo";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import App from "./App";
import ShopContextProvider from "@shared/context/ShopContext";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

// Create the configuration object
const googleConfig = {
  webClientId: "557799973381-ksp83t2vo6fdqufhm0iie06lnb4e8j8v.apps.googleusercontent.com",
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
