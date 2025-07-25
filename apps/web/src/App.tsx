// apps/web/src/App.tsx

import React, { useContext, useState, useEffect, ReactNode } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import HomePage from './pages/HomePage.web';
import LoginPage from './pages/LoginPage.web';
import ProfileDetailPage from './pages/ProfileDetailPage.web';
import Messages from './pages/Messages.web';
import Settings from './pages/Settings.web';
import CreateProfileForm from './components/CreateProfileForm.web';
import ManageProfileForm from './components/ManageProfileForm.web';
import PaymentPage from './pages/PaymentPage.web';
import AccountSection from './components/AccountSection.web';
import CookieConsentBanner from './components/CookieConsentBanner.web';
import CookiePolicy from './pages/CookiePolicy.web';
import Privacy from './components/Privacy.web';
import Spinner from './components/Spinner.web';
import TermsOfService from './components/TermsOfService';
import ClassVaultList from './components/ClassVaultList';
import ClassVaultDetail from './components/ClassVaultDetail';
import ClassVaultUpload from './components/ClassVaultUpload';

import { ShopContext } from '@mytutorapp/shared/context';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useContext(ShopContext) ?? {};
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    // Simulate startup (e.g. fetch persisted token)
    setIsAppLoading(false);
  }, []);

  if (isAppLoading) {
    return <Spinner />;
  }

  return (
    <>
      <ToastContainer
        className="p-2 rounded-lg shadow-soft font-sans"
        toastStyle={{ backgroundColor: '#f7f7f7', color: '#333333' }}
      />

      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/profile/:id" element={<ProfileDetailPage />} />
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route path="/privacy-policy" element={<Privacy />} />
        <Route path="/terms" element={<TermsOfService />} />

        {/* Protected */}
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountSection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <Messages />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/create"
          element={
            <ProtectedRoute>
              <CreateProfileForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/manage"
          element={
            <ProtectedRoute>
              <ManageProfileForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/account"
          element={
            <ProtectedRoute>
              <AccountSection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buy-tokens"
          element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          }
        />

        {/* ClassVault */}
        <Route
          path="/class-vault-library"
          element={
            <ProtectedRoute>
              <ClassVaultList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/class-vault/upload"
          element={
            <ProtectedRoute>
              <ClassVaultUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/class-vault/:id"
          element={
            <ProtectedRoute>
              <ClassVaultDetail />
            </ProtectedRoute>
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
