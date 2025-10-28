// apps/web/src/App.tsx
import React, { ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import RobotTutorPage from './pages/RobotTutor.web';
import SiteLayout from './layouts/SiteLayout.web';
import Landing from './pages/Landing.web';
import InstitutionLogin from './pages/org/InstitutionLogin.web';
import OrgProfilePage from './pages/org/OrgProfile.web';
import HomePage from './pages/HomePage.web';
import FindTutor from './pages/FindTutor.web';
import RefundsAndCancellations from './pages/RefundsAndCancellations';
import UnsubscribePage from './pages/Unsubscribe';
import FulfillmentPolicy from './pages/FulfillmentPolicy';
import PaymentFlow from './pages/PaymentFlow';
import LoginPage from './pages/LoginPage.web';
import ProfileDetailPage from './pages/ProfileDetailPage.web';
import OrgElearnPortal from './pages/org/OrgElearnPortal';
import OrgInviteLanding from './pages/org/OrgInviteLanding';
import ResultsPage from './pages/Results.web';
import Messages from './pages/Messages.web';
import MyEnrollmentsPage from './pages/MyEnrollments.web';
import ProfilePage from './pages/Profile.web';
import ResourcesPage from './pages/Resources.web';
import AccountSection from './components/AccountSection.web';
import CookieConsentBanner from './components/CookieConsentBanner.web';
import CookiePolicy from './pages/CookiePolicy.web';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import AntiSpamPolicy from './pages/AntiSpamPolicy';
import ComplaintsFeedback from './pages/ComplaintsFeedback';
import Spinner from './components/Spinner.web';
import HelpPage from './pages/HelpPage.web';
import CourseDetails from './pages/CourseDetails.web';
import MyCourses from './pages/MyCourses.web';
import EditCoursePage from './components/EditCourse.web';
import AuthBusyOverlay from './components/AuthBusyOverlay';
// ClassVault
import ClassVaultList from './components/ClassVaultList.web';
import ClassVaultDetail from './components/ClassVaultDetail.web';
import ClassVaultUpload from './components/ClassVaultUpload.web';

import { useShopContext } from '@mytutorapp/shared/context';
// NEW: org role hook
import { useOrg } from '@mytutorapp/shared/hooks/useOrg';
import InviteLogin from './pages/org/InviteLogin.web';

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

// NEW: role-specific org homes (create these pages)
import OrgLearnerHome from './pages/org/OrgLearnerHome.web';
import OrgInstructorHome from './pages/org/OrgInstructorHome.web';


import OerReaderFull from './pages/OerReaderFull.web';
import OerCollectionReader from './pages/OerCollectionReader.web';

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

/* Org-only protected route: checks orgToken (not user token) and avoids first-render race */
const OrgProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { orgToken } = useShopContext() as any;
  const location = useLocation();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), 0); // micro-tick to let context commit
    return () => clearTimeout(t);
  }, []);

  if (!ready) return null;

  if (orgToken) return <>{children}</>;

  try {
    const next = `${location.pathname}${location.search}${location.hash}`;
    sessionStorage.setItem('auth:returnTo', next);
  } catch {
    /* ignore storage errors */
  }

  return <Navigate to="/org/login" replace state={{ from: location }} />;
};


/* Enforce first-login redirect inside protected area (general app) */
const FirstLoginGate: React.FC = () => {
  const { token, userId, userEmail } = useShopContext();
  const location = useLocation();
  const isFirstLogin = useIsFirstLogin();
  const markSeen = useMarkFirstLoginSeen();

  if (!token) return null;

  const path = location.pathname;

  // ✅ Allowlist: never gate the profile & settings pages themselves
  if (path.startsWith('/profile/me') || path.startsWith('/settings/')) {
    return null;
  }

  // ✅ Only gate once identity is stable (prevents bounce before context loads)
  const identityStable =
    userId != null ||
    (typeof userEmail === 'string' && userEmail.trim().length > 0);

  if (!identityStable) {
    // Identity not ready—do nothing instead of redirecting
    return null;
  }

  if (isFirstLogin()) {
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
    markSeen();
    return <Navigate to="/profile/me" replace />;
  }
  return <Navigate to="/home" replace />;
};

/* If already logged in, bounce away from /login appropriately
   UPDATED: allow explicit switch via ?switch=1 or ?force=1 */
const LoggedOutOnly: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useShopContext();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const switching = params.get('switch') === '1' || params.get('force') === '1';

  const isFirstLogin = useIsFirstLogin();
  const markSeen = useMarkFirstLoginSeen();

  // If not logged in OR explicitly switching, render the login page
  if (!token || switching) return <>{children}</>;

  // NEW: if we have a saved deep link (e.g., /org/join/:code or a robot link),
  // honor that FIRST so invite flows return to the landing page.
  const returnTo = (() => {
    try { return sessionStorage.getItem('auth:returnTo') || ''; }
    catch { return ''; }
  })();

  if (returnTo && (returnTo.startsWith('/org/join/') || /[?&]assignmentId=/.test(returnTo))) {
    return <Navigate to={returnTo} replace />;
  }

  // Existing behavior
  const first = isFirstLogin();
  if (first) {
    markSeen();
    return <Navigate to="/profile/me" replace />;
  }
  return <Navigate to="/home" replace />;
};

/* Layout wrappers */
const ProtectedLayout: React.FC = () => (
  <ProtectedRoute>
    <FirstLoginGate />
    <SiteLayout />
  </ProtectedRoute>
);

const OrgProtectedLayout: React.FC = () => (
  <OrgProtectedRoute>
    <SiteLayout />
  </OrgProtectedRoute>
);

/* ───────────────────────────
   NEW: OrgHomeRouter
   - Sends learners to /org/learn (or saved invite/robot flow)
   - Sends instructors to /org/instructor
   - Sends owner/admin to /org/profile
   ─────────────────────────── */
const OrgHomeRouter: React.FC = () => {
  const nav = useNavigate();
  const { orgToken } = useShopContext() as any;
  const { role } = useOrg(); // 'owner' | 'admin' | 'instructor' | 'learner' | undefined

  React.useEffect(() => {
    if (!orgToken) {
      nav('/org/login', { replace: true });
      return;
    }

    // Learner: if we have a saved invite/deep link (e.g., /org/join/:code or ?assignmentId=),
    // honor that so they land directly in RobotTeacher after auth.
    if (role === 'learner') {
      const saved = (() => {
        try {
          return sessionStorage.getItem('auth:returnTo') || '';
        } catch { return ''; }
      })();

      if (saved && (/\/org\/join\//.test(saved) || /[?&]assignmentId=/.test(saved))) {
        nav(saved, { replace: true });
      } else {
        nav('/org/learn', { replace: true });
      }
      return;
    }

    if (role === 'instructor') {
      nav('/org/instructor', { replace: true });
      return;
    }

    // default: owner/admin or unknown → profile
    nav('/org/profile', { replace: true });
  }, [orgToken, role, nav]);

  return null;
};

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
          <Route path="/refunds" element={<RefundsAndCancellations />} />
          <Route path="/fulfillment" element={<FulfillmentPolicy />} />
          <Route path="/payment-flow" element={<PaymentFlow />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          {/* Org invite login (logged-out only) */}
          <Route
            path="/org/join/:code/login"
            element={
              <LoggedOutOnly>
                <InviteLogin />
              </LoggedOutOnly>
            }
          />

          {/* Org public routes */}
          <Route path="/org/login" element={<InstitutionLogin />} />
          <Route path="/org/join/:code" element={<OrgInviteLanding />} />

          {/* Public content */}
          <Route path="/help" element={<HelpPage />} />
          <Route path="/profile/:id" element={<ProfileDetailPage />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/anti-spam-policy" element={<AntiSpamPolicy />} />
          <Route path="/complaints-feedback" element={<ComplaintsFeedback />} />
          <Route path="/resources" element={<ResourcesPage />} />
          
          
          <Route path="/oer/:id" element={<OerReaderFull />} />
          <Route path="/oer/collections/:id" element={<OerCollectionReader />} />

          {/* Public catalog */}
          <Route path="/courses" element={<MyCourses />} />

           {/* Public videos (OER collections + detail) */}
          
          


          {/* Public verify routes */}
          <Route path="/verify/:id" element={<VerifyCertificatePage />} />
          <Route path="/verify/:id/print" element={<VerifyCertificatePrintPage />} />
        </Route>

        {/* Org portal (protected; no first-login bounce) */}
        <Route element={<OrgProtectedLayout />}>
          {/* NEW: make /org a smart role router */}
          <Route path="/org" element={<OrgHomeRouter />} />
          {/* keep portal at /org/portal so existing “portal UI” is reachable */}
          <Route path="/org/portal" element={<OrgElearnPortal />} />
          <Route path="/org/profile" element={<OrgProfilePage />} />
          {/* NEW role-specific homes */}
          <Route path="/org/learn" element={<OrgLearnerHome />} />
          <Route path="/org/instructor" element={<OrgInstructorHome />} />
        </Route>

        {/* Protected pages with layout (general app) */}
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
