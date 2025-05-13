// apps/mobile/src/App.tsx

import * as React from 'react';
import type { ReactNode } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import HomePage from './screens/HomePage.native';
import LoginPage from './screens/LoginScreen.native';
import ProfileDetailPage from './screens/ProfileDetailScreen.native';
import Messages from './screens/Messages.native';
import Settings from './screens/SettingsScreen.native';
import CreateProfileForm from './screens/CreateProfileForm.native';
import ManageProfileForm from './screens/ManageProfileForm.native';
import PaymentPage from './screens/PaymentScreen.native';
import AccountSection from './screens/AccountSection.native';
import CookieConsentBanner from './screens/CookieConsentBanner.native';
import CookiePolicy from './screens/CookiePolicy.native';
import Spinner from './screens/Spinner.native';

import { useShopContext } from '@mytutorapp/shared/context';

interface ProtectedRouteProps {
  children: ReactNode;
}
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useShopContext();
  // If there's no token, show the login screen
  if (!token) {
    return <LoginPage />;
  }
  return <>{children}</>;
};

type MainStackParamList = {
  Home: undefined;
  Login: undefined;
  Account: undefined;
  Profile: undefined;
  Messages: undefined;
  Settings: undefined;
  SettingsCreate: undefined;
  SettingsManage: undefined;
  SettingsAccount: undefined;
  CookiePolicy: undefined;
  BuyTokens: undefined;
};

const Stack = createStackNavigator<MainStackParamList>();

const App: React.FC = () => {
  // Local splash/ready state
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    // …any async setup you need…
    setIsReady(true);
  }, []);

  // Show spinner until ready
  if (!isReady) {
    return <Spinner />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          {/* Public Screens */}
          <Stack.Screen name="Home" component={HomePage} />
          <Stack.Screen name="Login" component={LoginPage} />
          <Stack.Screen name="CookiePolicy" component={CookiePolicy} />

          {/* Protected Screens */}
          <Stack.Screen name="Account">
            {() => (
              <ProtectedRoute>
                <AccountSection />
              </ProtectedRoute>
            )}
          </Stack.Screen>
          <Stack.Screen name="Profile">
            {() => (
              <ProtectedRoute>
                <ProfileDetailPage />
              </ProtectedRoute>
            )}
          </Stack.Screen>
          <Stack.Screen name="Messages">
            {() => (
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            )}
          </Stack.Screen>
          <Stack.Screen name="Settings">
            {() => (
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            )}
          </Stack.Screen>
          <Stack.Screen name="SettingsCreate">
            {() => (
              <ProtectedRoute>
                <CreateProfileForm />
              </ProtectedRoute>
            )}
          </Stack.Screen>
          <Stack.Screen name="SettingsManage">
            {() => (
              <ProtectedRoute>
                <ManageProfileForm />
              </ProtectedRoute>
            )}
          </Stack.Screen>
          <Stack.Screen name="SettingsAccount">
            {() => (
              <ProtectedRoute>
                <AccountSection />
              </ProtectedRoute>
            )}
          </Stack.Screen>
          <Stack.Screen name="BuyTokens">
            {() => (
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            )}
          </Stack.Screen>
        </Stack.Navigator>

        {/* This banner sits above all screens */}
        <CookieConsentBanner />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default App;
