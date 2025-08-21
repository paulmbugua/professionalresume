// apps/mobile/src/App.tsx
import * as React from 'react'
import type { ReactNode } from 'react'
import { SafeAreaView, StatusBar } from 'react-native'
import { createStackNavigator } from '@react-navigation/stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import tw from '../tailwind'
import { useThemeMode } from './theme/ThemeProvider'   // 👈 get current scheme
import useTWColors from './theme/useTWColors'          // 👈 our color helper

// screens...
import NavbarNative from './screens/Navbar.native'
import FooterNative from './screens/Footer.native'
import HomePageNative from './screens/HomePage.native'
import FindTutorScreen from './screens/FindTutorScreen.native'
import LoginPage from './screens/LoginScreen.native'
import ProfileDetailPage from './screens/ProfileDetailScreen.native'
import Messages from './screens/Messages.native'
import Settings from './screens/SettingsScreen.native'
import CreateProfileForm from './screens/CreateProfileForm.native'
import ManageProfileForm from './screens/ManageProfileForm.native'
import PaymentScreen from './screens/PaymentScreen.native'
import AccountSection from './screens/AccountSection.native'
import Spinner from './screens/Spinner.native'
import ClassVaultListScreen from './screens/ClassVaultListScreen.native'
import ClassVaultDetailScreen from './screens/ClassVaultDetailScreen.native'
import ClassVaultUploadScreen from './screens/ClassVaultUploadScreen.native'
import type { MainStackParamList } from './navigation/types'
import { useShopContext } from '@mytutorapp/shared/context'
import { useHomePage } from '@mytutorapp/shared/hooks'

const Stack = createStackNavigator<MainStackParamList>()

interface ProtectedRouteProps { children: ReactNode }
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useShopContext()
  if (!token) return <LoginPage />
  return <>{children}</>
}

const App: React.FC = () => {
  const [isReady, setIsReady] = React.useState(false)
  const { scheme } = useThemeMode()          // 'light' | 'dark'
  const colors = useTWColors()

  const {
    filteredProfiles,
    loading,
    filters,
    handleSearch,
    onFilterChange,
    clearFilters,
    reloadProfiles,
  } = useHomePage()

  React.useEffect(() => { setIsReady(true) }, [])
  if (!isReady) return <Spinner />

  return (
    <SafeAreaProvider>
      {/* Status bar that matches the theme */}
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {/* Root container must carry the themed background */}
      <SafeAreaView style={tw`flex-1 bg-lightBg dark:bg-darkBg`}>
        {/* Global Navbar also should use themed styles internally */}
        

        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            // prevent white flashes during pushes
            cardStyle: tw.style('bg-lightBg dark:bg-darkBg') as any,
          }}
        >
          <Stack.Screen name="Home">
  {() => (
    <>
      <NavbarNative
        onSearch={handleSearch}
        onFilterChange={onFilterChange}
        clearFilters={clearFilters}
      />
      <HomePageNative
        filteredProfiles={filteredProfiles}
        loading={loading}
        reloadProfiles={reloadProfiles}
      />
    </>
  )}
</Stack.Screen>


          <Stack.Screen name="FindTutor" component={FindTutorScreen} />
          <Stack.Screen name="Login" component={LoginPage} />
          <Stack.Screen name="Profile" component={ProfileDetailPage} />
          <Stack.Screen name="VerifyCertificate" component={VerifyCertificateScreen} />

          <Stack.Screen name="ClassVaultLibrary">
            {() => (
              <ClassVaultListScreen
                filters={filters}
                clearFilters={clearFilters}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="ClassVaultDetail" component={ClassVaultDetailScreen} />

          {/* Protected */}
          <Stack.Screen name="Account">
            {() => (
              <ProtectedRoute>
                <AccountSection />
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
          <Stack.Screen name="BuyTokens">
            {() => (
              <ProtectedRoute>
                <PaymentScreen />
              </ProtectedRoute>
            )}
          </Stack.Screen>
          <Stack.Screen name="ClassVaultUpload">
            {() => (
              <ProtectedRoute>
                <ClassVaultUploadScreen />
              </ProtectedRoute>
            )}
          </Stack.Screen>
        </Stack.Navigator>

        {/* Global Footer (make sure it uses bg-lightCard/darkCard, not hardcoded) */}
        <FooterNative clearFilters={clearFilters} />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

export default App
