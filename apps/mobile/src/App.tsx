import * as React from 'react'
import type { ReactNode } from 'react'
import { SafeAreaView } from 'react-native'
import { createStackNavigator } from '@react-navigation/stack'
import type { MainStackParamList } from './navigation/types'
import { SafeAreaProvider } from 'react-native-safe-area-context'

// Global components
import NavbarNative from './screens/Navbar.native'
import FooterNative from './screens/Footer.native'
import HomePageNative from './screens/HomePage.native'
import LoginPage from './screens/LoginScreen.native'
import ProfileDetailPage from './screens/ProfileDetailScreen.native'
import Messages from './screens/Messages.native'
import Settings from './screens/SettingsScreen.native'
import CreateProfileForm from './screens/CreateProfileForm.native'
import ManageProfileForm from './screens/ManageProfileForm.native'
import PaymentScreen from './screens/PaymentScreen.native'
import AccountSection from './screens/AccountSection.native'
import Spinner from './screens/Spinner.native'
import { useShopContext } from '@mytutorapp/shared/context'
import { useHomePage } from '@mytutorapp/shared/hooks'

// ClassVault
import ClassVaultListScreen from './screens/ClassVaultListScreen.native'
import ClassVaultDetailScreen from './screens/ClassVaultDetailScreen.native'
import ClassVaultUploadScreen from './screens/ClassVaultUploadScreen.native'

const Stack = createStackNavigator<MainStackParamList>()

interface ProtectedRouteProps {
  children: ReactNode
}
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useShopContext()
  if (!token) {
    return <LoginPage />
  }
  return <>{children}</>
}

const App: React.FC = () => {
  const [isReady, setIsReady] = React.useState(false)

  // Single useHomePage hook drives both navbar and homepage
  const {
    filteredProfiles,  // MappedProfile[]
    loading,
    filters,
    handleSearch,
    onFilterChange,
    clearFilters,
    reloadProfiles,
  } = useHomePage()

  React.useEffect(() => {
    setIsReady(true)
  }, [])

  if (!isReady) {
    return <Spinner />
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Global Navbar */}
        <NavbarNative
          onSearch={handleSearch}
          onFilterChange={onFilterChange}
          clearFilters={clearFilters}
        />

        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          {/* Home */}
          <Stack.Screen name="Home">
            {() => (
              <HomePageNative
                filteredProfiles={filteredProfiles}
                loading={loading}
                reloadProfiles={reloadProfiles}
              />
            )}
          </Stack.Screen>

          {/* Auth */}
          <Stack.Screen name="Login" component={LoginPage} />

          {/* Public ProfileDetail */}
          <Stack.Screen name="Profile" component={ProfileDetailPage} />

          {/* ClassVault */}
          <Stack.Screen name="ClassVaultLibrary">
          {() => (
            <ClassVaultListScreen
              filters={filters}
              clearFilters={clearFilters}
            />
          )}
        </Stack.Screen>

          <Stack.Screen
            name="ClassVaultDetail"
            component={ClassVaultDetailScreen}
          />

          {/* Protected Sections */}
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

          {/* Tutor-only Upload */}
          <Stack.Screen name="ClassVaultUpload">
            {() => (
              <ProtectedRoute>
                <ClassVaultUploadScreen />
              </ProtectedRoute>
            )}
          </Stack.Screen>
        </Stack.Navigator>

        {/* Global Footer */}
        <FooterNative clearFilters={clearFilters} />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

export default App
