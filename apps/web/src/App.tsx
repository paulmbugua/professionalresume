// apps/web/src/App.tsx
import React, { ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SiteLayout from './layouts/SiteLayout.web';
import Landing from './pages/Landing.web';
import HomePage from './pages/HomePage.web';
import FindTutor from './pages/FindTutor.web';
import LoginPage from './pages/LoginPage.web';
import ProfileDetailPage from './pages/ProfileDetailPage.web';
import Messages from './pages/Messages.web';
import MyEnrollmentsPage from './pages/MyEnrollments.web';
import ProfilePage from './pages/Profile.web';
import ResourcesPage from './pages/Resources.web';

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

// ⬇️ NEW: Profile create/manage forms
import CreateProfileForm from './components/CreateProfileForm.web';
import ManageProfileForm from './components/ManageProfileForm.web';

// ── Route guards ─────────────────────────────────────────────────────────────
interface ProtectedRouteProps { children: ReactNode }
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useShopContext();
  const location = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
};

const RootLandingOrHome: React.FC = () => {
  const { token } = useShopContext();
  return token ? <Navigate to="/home" replace /> : <Landing />;
};

const LoggedOutOnly: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useShopContext();
  return token ? <Navigate to="/home" replace /> : <>{children}</>;
};

const ProtectedLayout: React.FC = () => (
  <ProtectedRoute>
    <SiteLayout />
  </ProtectedRoute>
);

// ── App ──────────────────────────────────────────────────────────────────────
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

          {/* Public content */}
          <Route path="/help" element={<HelpPage />} />
          {/* /profile/me is now protected below */}
          <Route path="/profile/:id" element={<ProfileDetailPage />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/privacy-policy" element={<Privacy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/resources" element={<ResourcesPage />} />


          {/* Public catalog */}
          <Route path="/courses" element={<MyCourses />} />

          {/* Public verify routes */}
          <Route path="/verify/:id" element={<VerifyCertificatePage />} />
          {/* print can be public too */}
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

          {/* Enrollments */}
          <Route path="/my-courses" element={<MyEnrollmentsPage />} />

          {/* Course lifecycle (protected) */}
          <Route path="/create-course" element={<CreateCourse />} />
          <Route path="/enroll/:courseId" element={<CourseEnrollment />} />
          {/* Keep original route… */}
          <Route path="/progress/:courseId" element={<CourseProgress />} />
          {/* …and add alias used by Profile page StudentProgressRow */}
          <Route path="/courses/:courseId/progress" element={<CourseProgress />} />
          <Route path="/achievements" element={<AchievementsList />} />

          {/* 🔐 Profile pages (protected) */}
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
    </>
  );
};

export default App;
