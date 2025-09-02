// apps/web/src/App.tsx
import React, { ReactNode, useMemo } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import RobotTutorPage from './pages/RobotTutor.web';
import SiteLayout from './layouts/SiteLayout.web';
import Landing from './pages/Landing.web';
import HomePage from './pages/HomePage.web';
import FindTutor from './pages/FindTutor.web';
import LoginPage from './pages/LoginPage.web';
import ProfileDetailPage from './pages/ProfileDetailPage.web';
import ResultsPage from './pages/Results.web';
import Messages from './pages/Messages.web';
import MyEnrollmentsPage from './pages/MyEnrollments.web';
import ProfilePage from './pages/Profile.web';
import ResourcesPage from './pages/Resources.web';
import RobotExportPage from './pages/RobotExport.web';
import AccountSection from './components/AccountSection.web';
import CookieConsentBanner from './components/CookieConsentBanner.web';
import CookiePolicy from './pages/CookiePolicy.web';
import Privacy from './components/Privacy.web';
import Spinner from './components/Spinner.web';
import HelpPage from './pages/HelpPage.web';
import TermsOfService from './components/TermsOfService';
import CourseDetails from './pages/CourseDetails.web';
import MyCourses from './pages/MyCourses.web';
import EditCoursePage from './components/EditCourse.web';
import AuthBusyOverlay from './components/AuthBusyOverlay';
// ClassVault
import ClassVaultList from './components/ClassVaultList';
import ClassVaultDetail from './components/ClassVaultDetail';
import ClassVaultUpload from './components/ClassVaultUpload';

import { useShopContext } from '@mytutorapp/shared/context';

// Course lifecycle
import CreateCourse from './components/CreateCourse.web';
import CourseEnrollment from './components/CourseEnrollment.web';
import CourseProgress from './components/CourseProgress.web';
import AchievementsList from './components/AchievementsList.web';

// Public verify views
import VerifyCertificatePage from './components/VerifyCertificate.web';
import VerifyCertificatePrintPage from './components/VerifyCertificatePrint.web';

// Profile create/manage forms
import CreateProfileForm from './components/CreateProfileForm.web';
import ManageProfileForm from './components/ManageProfileForm.web';

/* ───────────────────────────
   Per-user "first login" helpers
   ─────────────────────────── */
const firstLoginKey = (
  userId?: string | number | null,
  email?: string | null | undefined
) => `tutorapp_hasLoggedInOnce::${userId ?? email ?? 'unknown'}`;

// Treat identity as "stable" only when we have userId or a non-empty email.
// We NEVER mark the flag for the "unknown" identity to avoid poisoning first-login.
const useIdentityKey = () => {
  const { userId, userEmail } = useShopContext();
  const stable =
    userId != null ||
    (typeof userEmail === 'string' && userEmail.trim().length > 0);
  const key = stable ? firstLoginKey(userId ?? null, userEmail ?? null) : firstLoginKey(null, null);
  return { key, stable };
};

const useIsFirstLogin = () => {
  const { key, stable } = useIdentityKey();
  return () => {
    if (!stable) return true; // before identity loads, assume "first" so we can route to profile
    return localStorage.getItem(key) !== 'true';
  };
};

const useMarkFirstLoginSeen = () => {
  const { key, stable } = useIdentityKey();
  return () => {
    if (stable) localStorage.setItem(key, 'true');
  };
};

/* ───────────────────────────
   Route guards
   ─────────────────────────── */
interface ProtectedRouteProps { children: ReactNode }
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useShopContext();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
};

/* Enforce first-login redirect inside protected area */
const FirstLoginGate: React.FC = () => {
  const { token } = useShopContext();
  const location = useLocation();
  const isFirstLogin = useIsFirstLogin();
  const markSeen = useMarkFirstLoginSeen();

  if (!token) return null;

  const alreadyOnProfile = location.pathname.startsWith('/profile/me');
  if (isFirstLogin() && !alreadyOnProfile) {
    // Mark only when identity is stable; hook no-ops if not.
    markSeen();
    return <Navigate to="/profile/me" replace />;
  }
  return null;
};

/* Root landing: decide "/" after auth */
const RootLandingOrHome: React.FC = () => {
  const { token } = useShopContext();
  const isFirstLogin = useIsFirstLogin();
  const markSeen = useMarkFirstLoginSeen();

  if (!token) return <Landing />;

  const first = isFirstLogin();
  if (first) {
    // Mark only if identity is stable; otherwise FirstLoginGate will mark on /profile/me
    markSeen();
    return <Navigate to="/profile/me" replace />;
  }
  return <Navigate to="/home" replace />;
};

/* If already logged in, bounce away from /login appropriately */
const LoggedOutOnly: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useShopContext();
  const isFirstLogin = useIsFirstLogin();
  const markSeen = useMarkFirstLoginSeen();

  if (!token) return <>{children}</>;

  const first = isFirstLogin();
  if (first) {
    markSeen();
    return <Navigate to="/profile/me" replace />;
  }
  return <Navigate to="/home" replace />;
};

/* Layout wrapper for protected routes */
const ProtectedLayout: React.FC = () => (
  <ProtectedRoute>
    <FirstLoginGate />
    <SiteLayout />
  </ProtectedRoute>
);

/* ───────────────────────────
   App
   ─────────────────────────── */
const App: React.FC<{}> = () => {
  const { initializing } = useShopContext();
  if (initializing) return <Spinner />;

  return (
    <>
      <Routes>
        {/* Public pages with layout */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<RootLandingOrHome />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/find-tutor" element={<FindTutor />} />
        <Route path="/robot-teach" element={<RobotTutorPage />} />
          

          {/* Public content */}
          <Route path="/help" element={<HelpPage />} />
          <Route path="/profile/:id" element={<ProfileDetailPage />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/privacy-policy" element={<Privacy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/robot-export" element={<RobotExportPage />} />
          {/* Public catalog */}
          <Route path="/courses" element={<MyCourses />} />

          {/* Public verify routes */}
          <Route path="/verify/:id" element={<VerifyCertificatePage />} />
          <Route path="/verify/:id/print" element={<VerifyCertificatePrintPage />} />
        </Route>

        {/* Protected pages with layout */}
        <Route element={<ProtectedLayout />}>
          <Route path="/account" element={<AccountSection />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/courses/:courseId" element={<CourseDetails />} />
          <Route path="/courses/:id/edit" element={<EditCoursePage />} />

          {/* ClassVault */}
          <Route path="/class-vault/upload" element={<ClassVaultUpload />} />
          <Route path="/class-vault/:id" element={<ClassVaultDetail />} />
          <Route path="/class-vault" element={<ClassVaultList />} />
          <Route path="/results" element={<ResultsPage />} />

          {/* Enrollments */}
          <Route path="/my-courses" element={<MyEnrollmentsPage />} />

          {/* Course lifecycle (protected) */}
          <Route path="/create-course" element={<CreateCourse />} />
          <Route path="/enroll/:courseId" element={<CourseEnrollment />} />
          <Route path="/progress/:courseId" element={<CourseProgress />} />
          <Route path="/courses/:courseId/progress" element={<CourseProgress />} />
          <Route path="/achievements" element={<AchievementsList />} />

          {/* Profile pages (protected) */}
          <Route path="/profile/me" element={<ProfilePage />} />
          <Route path="/settings/create" element={<CreateProfileForm />} />
          <Route path="/settings/manage" element={<ManageProfileForm />} />
        </Route>

        {/* Auth route (logged-out only) */}
        <Route
          path="/login"
          element={
            <LoggedOutOnly>
              <LoginPage />
            </LoggedOutOnly>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <CookieConsentBanner />
      <AuthBusyOverlay />
   
    </>
  );
};

export default App;

