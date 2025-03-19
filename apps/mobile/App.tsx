import React, { useContext } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { ShopContext } from "@shared/context/ShopContext";

// Import your screens
import LoginScreen from "./src/screens/LoginScreen.native";
import ProfileDetailScreen from "./src/screens/ProfileDetailScreen.native";
import Messages from "./src/screens/Messages.native";
import SettingsScreen from "./src/screens/SettingsScreen.native";
import PaymentScreen from "./src/screens/PaymentScreen.native";
import AccountSectionNative from "./src/screens/AccountSection.native";
import CookiePolicy from "./src/screens/CookiePolicy.native";
import Spinner from "./src/screens/Spinner.native";

const Stack = createStackNavigator();

// A simple wrapper for protected screens
const ProtectedScreen: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const shopContext = useContext(ShopContext);
  if (!shopContext) {
    return <LoginScreen />;
  }
  const { token } = shopContext;
  return token ? <>{children}</> : <LoginScreen />;
};

const App: React.FC = () => {
  const shopContext = useContext(ShopContext);
  if (!shopContext) {
    throw new Error("ShopContext is not provided");
  }
  const { token } = shopContext;

  const isAppInitialized = true;

  if (!isAppInitialized) {
    return <Spinner />;
  }

  return (
    <Stack.Navigator initialRouteName={token ? "Account" : "Login"}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Account" component={AccountSectionNative} options={{ headerShown: false }} />
      <Stack.Screen name="ProfileDetail" component={ProfileDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Messages" options={{ headerShown: false }}>
        {() => (
          <ProtectedScreen>
            <Messages />
          </ProtectedScreen>
        )}
      </Stack.Screen>
      <Stack.Screen name="Settings" options={{ headerShown: false }}>
        {() => (
          <ProtectedScreen>
            <SettingsScreen />
          </ProtectedScreen>
        )}
      </Stack.Screen>
      <Stack.Screen name="Payment" options={{ headerShown: false }}>
        {() => (
          <ProtectedScreen>
            <PaymentScreen />
          </ProtectedScreen>
        )}
      </Stack.Screen>
      <Stack.Screen name="CookiePolicy" component={CookiePolicy} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default App;
