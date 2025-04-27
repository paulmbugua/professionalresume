// apps/mobile/src/App.tsx

import * as React from 'react';
import type { ReactNode } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
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

import { ShopContext } from '@mytutorapp/shared/context';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // Grab the entire context (which might be undefined),
  // then safely pull out `token` via optional chaining.
  const shopContext = React.useContext(ShopContext);
  const token = shopContext?.token;

  // If there's no token (or no context at all), show login.
  if (!token) {
    return <LoginPage />;
  }

  // Otherwise render the protected children.
  return <>{children}</>;
};

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    // …any async setup you need…
    setIsReady(true);
  }, []);

  if (!isReady) {
    return <Spinner />;
  }

  return (
    <>
      <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomePage} />
        <Stack.Screen name="Login" component={LoginPage} />
        <Stack.Screen name="Account" component={AccountSection} />
        <Stack.Screen name="ProfileDetail" component={ProfileDetailPage} />

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

        <Stack.Screen name="CookiePolicy" component={CookiePolicy} />

        <Stack.Screen name="BuyTokens">
          {() => (
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          )}
        </Stack.Screen>
      </Stack.Navigator>

      <CookieConsentBanner />
    </>
  );
};

export default App;
