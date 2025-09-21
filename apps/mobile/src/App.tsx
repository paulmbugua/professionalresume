// apps/mobile/src/App.tsx
import * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native'; // ← StatusBar removed
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStackNavigator } from '@react-navigation/stack';

import type { MainStackParamList } from './navigation/types';
import { useShopContext } from '@mytutorapp/shared/context';
import { useHomePage } from '@mytutorapp/shared/hooks';

// Global UI
import NavbarNative from './screens/Navbar.native';
import FooterNav from './screens/FooterNav.native';
import Spinner from './screens/Spinner.native';

// Core app screens
import HomePageNative from './screens/HomePage.native';
import LoginScreen from './screens/LoginScreen.native';
import ProfileDetailPage from './screens/ProfileDetailScreen.native';
import Messages from './screens/Messages.native';
import Settings from './screens/SettingsScreen.native';
import CreateProfileForm from './screens/CreateProfileForm.native';
import ManageProfileForm from './screens/ManageProfileForm.native';
import AccountSection from './screens/AccountSection.native';

// ClassVault
import ClassVaultListScreen from './screens/ClassVaultListScreen.native';
import ClassVaultDetailScreen from './screens/ClassVaultDetailScreen.native';
import ClassVaultUploadScreen from './screens/ClassVaultUploadScreen.native';

// Public / other screens
import Landing from './screens/Landing.native';
import RobotTutorPage from './screens/RobotTutor.native';
import FindTutor from './screens/FindTutor.native';
import RefundsAndCancellations from './screens/RefundsAndCancellations.native';
import UnsubscribePage from './screens/Unsubscribe.native';
import FulfillmentPolicy from './screens/FulfillmentPolicy.native';
import OrgElearnPortal from './screens/org/OrgElearnPortal.native';
import OrgInviteLanding from './screens/org/OrgInviteLanding.native';
import InstitutionLogin from './screens/org/InstitutionLogin.native';
import OrgProfilePage from './screens/org/OrgProfile.native';
import ResultsPage from './screens/Results.native';
import MyEnrollmentsPage from './screens/MyEnrollments.native';
import ProfileScreen from './screens/ProfileScreen.native';
import ResourcesPage from './screens/Resources.native';

import PrivacyPolicy from './screens/PrivacyPolicy.native';
import TermsOfService from './screens/TermsOfService.native';
import AntiSpamPolicy from './screens/AntiSpamPolicy.native';
import ComplaintsFeedback from './screens/ComplaintsFeedback.native';
import HelpPage from './screens/HelpPage.native';
import CourseDetails from './screens/CourseDetails.native';
import MyCourses from './screens/MyCourses.native';

// Course lifecycle
import CreateCourse from './screens/CreateCourse.native';
import CourseEnrollment from './screens/CourseEnrollment.native';
import CourseProgress from './screens/CourseProgress.native';
import AchievementsList from './screens/AchievementsList.native';

// Public verify views
import VerifyCertificatePage from './screens/VerifyCertificate.native';
import VerifyCertificatePrintPage from './screens/VerifyCertificatePrintScreen.native';

// Payments
import PaymentFlow from './screens/PaymentFlow.native';

const Stack = createStackNavigator<MainStackParamList>();

/* ───────── First-login helpers ───────── */
const firstLoginKey = (userId?: string | number | null, email?: string | null | undefined) =>
  `tutorapp_hasLoggedInOnce::${userId ?? email ?? 'unknown'}`;

const useIdentityKey = () => {
  const { userId, userEmail, profile } = useShopContext() as any;
  const id = userId ?? profile?.id ?? null;
  const email = userEmail ?? profile?.email ?? null;
  const stable = id != null || (typeof email === 'string' && email.trim().length > 0);
  const key = firstLoginKey(id ?? null, email ?? null);
  return { key, stable };
};

const useIsFirstLogin = () => {
  const { key, stable } = useIdentityKey();
  return React.useCallback(async () => {
    if (!stable) return true;
    const v = await AsyncStorage.getItem(key);
    return v !== 'true';
  }, [key, stable]);
};

const useMarkFirstLoginSeen = () => {
  const { key, stable } = useIdentityKey();
  return React.useCallback(async () => {
    if (stable) await AsyncStorage.setItem(key, 'true');
  }, [key, stable]);
};

/* ───────── Route guard ───────── */
interface ProtectedRouteProps { children: ReactNode }
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useShopContext();
  if (!token) return <LoginScreen />;
  return <>{children}</>;
};

/* ───────── App ───────── */
const App: React.FC = () => {
  const [bootReady, setBootReady] = React.useState(false);
  const [initialRoute, setInitialRoute] =
    React.useState<keyof MainStackParamList>('Landing');

  const { token, initializing } = (useShopContext() as any) ?? {};
  const isFirstLogin = useIsFirstLogin();
  const markSeen = useMarkFirstLoginSeen();

  const { filters, handleSearch, clearFilters } = useHomePage();

  React.useEffect(() => {
    let mounted = true;
    const decide = async () => {
      if (token) {
        const first = await isFirstLogin();
        if (first) await markSeen();
      }
      mounted && setBootReady(true);
      mounted && setInitialRoute('Landing');
    };
    void decide();
    return () => { mounted = false; };
  }, [token, isFirstLogin, markSeen]);

  if (initializing === true) return <Spinner />;
  if (!bootReady) return <Spinner />;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
      {/* StatusBar removed — root handles it */}

      {/* Always-on Navbar */}
      <NavbarNative onSearch={handleSearch} />

      {/* Main navigator content (no bottom padding reservation) */}
      <View style={{ flex: 1 }}>
        <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          {/* Public: Landing first */}
          <Stack.Screen name="Landing" component={Landing} />

          {/* Public / base */}
          <Stack.Screen name="Home" component={HomePageNative} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="FindTutor" component={FindTutor} />
          <Stack.Screen name="RobotTutor" component={RobotTutorPage} />
          <Stack.Screen name="Help" component={HelpPage} />
          <Stack.Screen name="Resources" component={ResourcesPage} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
          <Stack.Screen name="TermsOfService" component={TermsOfService} />
          <Stack.Screen name="AntiSpamPolicy" component={AntiSpamPolicy} />
          <Stack.Screen name="ComplaintsFeedback" component={ComplaintsFeedback} />
          <Stack.Screen name="RefundsAndCancellations" component={RefundsAndCancellations} />
          <Stack.Screen name="Unsubscribe" component={UnsubscribePage} />
          <Stack.Screen name="FulfillmentPolicy" component={FulfillmentPolicy} />
          <Stack.Screen name="PaymentFlow" component={PaymentFlow} />
          <Stack.Screen name="VerifyCertificate" component={VerifyCertificatePage} />
          <Stack.Screen name="VerifyCertificatePrint" component={VerifyCertificatePrintPage} />

          {/* Org public */}
          <Stack.Screen name="InstitutionLogin" component={InstitutionLogin} />
          <Stack.Screen name="OrgInviteLanding" component={OrgInviteLanding} />

          {/* Public catalog / details */}
          <Stack.Screen name="ProfileSelf" component={ProfileScreen} />
          <Stack.Screen name="Profile" component={ProfileDetailPage} />
          <Stack.Screen name="Courses" component={MyCourses} />
          <Stack.Screen name="CourseDetails" component={CourseDetails} />

          {/* ClassVault */}
          <Stack.Screen name="ClassVaultLibrary">
            {() => {
              const classVaultFilters = React.useMemo(
                () => ({
                  category: (filters as any)?.videoCategory ?? (filters as any)?.category,
                  ageGroup: (filters as any)?.videoAgeGroup ?? (filters as any)?.ageGroup,
                }),
                [filters]
              );

              return (
                <ClassVaultListScreen
                  filters={classVaultFilters}
                  clearFilters={clearFilters}
                />
              );
            }}
          </Stack.Screen>

          <Stack.Screen name="ClassVaultDetail" component={ClassVaultDetailScreen} />

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

          {/* Tutor-only Upload */}
          <Stack.Screen name="ClassVaultUpload">
            {() => (
              <ProtectedRoute>
                <ClassVaultUploadScreen />
              </ProtectedRoute>
            )}
          </Stack.Screen>

          {/* Enrollments & Learning (protected) */}
          <Stack.Screen name="MyEnrollments">
            {() => (
              <ProtectedRoute>
                <MyEnrollmentsPage />
              </ProtectedRoute>
            )}
          </Stack.Screen>

          <Stack.Screen name="CreateCourse">
            {() => (
              <ProtectedRoute>
                <CreateCourse />
              </ProtectedRoute>
            )}
          </Stack.Screen>

          <Stack.Screen name="CourseEnrollment">
            {() => (
              <ProtectedRoute>
                <CourseEnrollment />
              </ProtectedRoute>
            )}
          </Stack.Screen>

          <Stack.Screen name="CourseProgress">
            {() => (
              <ProtectedRoute>
                <CourseProgress />
              </ProtectedRoute>
            )}
          </Stack.Screen>

          <Stack.Screen name="Achievements">
            {() => (
              <ProtectedRoute>
                <AchievementsList />
              </ProtectedRoute>
            )}
          </Stack.Screen>

          {/* Org portal (protected) */}
          <Stack.Screen name="OrgElearnPortal">
            {() => (
              <ProtectedRoute>
                <OrgElearnPortal />
              </ProtectedRoute>
            )}
          </Stack.Screen>

          <Stack.Screen name="OrgProfile">
            {() => (
              <ProtectedRoute>
                <OrgProfilePage />
              </ProtectedRoute>
            )}
          </Stack.Screen>

          {/* Results (protected) */}
          <Stack.Screen name="Results">
            {() => (
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </View>

      {/* Transparent, OVERLAY footer (icons only) */}
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 50 }}
      >
        <FooterNav
          aiRouteName="RobotTutor"
          homeRouteName="Home"
          profileRouteName="ProfileSelf"
        />
      </View>
    </SafeAreaView>
  );
};

export default App;
