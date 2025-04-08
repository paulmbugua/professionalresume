import React, { useContext, useState, useEffect, ReactNode } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import HomePage from './screens/HomePage.native';
import LoginPage from './screens/LoginScreen.native';
import ProfileDetailPage from './screens/ProfileDetailScreen.native';
import Messages from './screens/Messages.native';
import Settings from './screens/SettingsScreen.native';
import CreateProfileForm from './screens/CreateProfileForm.native';
import ManageProfileForm from './screens/ManageProfileForm.native';
import PaymentPage from './screens/PaymentScreen.native';
import { ShopContext } from '@shared/context';
import AccountSection from './screens/AccountSection.native';
import CookieConsentBanner from './screens/CookieConsentBanner.native';
import CookiePolicy from './screens/CookiePolicy.native';
import Spinner from './screens/Spinner.native';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const shopContext = useContext(ShopContext);
  return shopContext?.token ? <>{children}</> : <LoginPage />;
};

const Stack = createStackNavigator();

const App: React.FC = () => {
  const [isAppInitialized, setIsAppInitialized] = useState(true);

  // Simulate app initialization (e.g., for future OAuth or settings)
  useEffect(() => {
    setIsAppInitialized(false);
  }, []);

  if (isAppInitialized) return <Spinner />;

  return (
    <NavigationContainer>
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
    </NavigationContainer>
  );
};

export default App;
