import React, { useContext, useState, useEffect, ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage.web';
import LoginPage from './pages/LoginPage.web';
import ProfileDetailPage from './pages/ProfileDetailPage.web';
import Messages from './pages/Messages.web';
import Settings from './pages/Settings.web';
import CreateProfileForm from './components/CreateProfileForm.web';
import ManageProfileForm from './components/ManageProfileForm.web';
import PaymentPage from './pages/PaymentPage.web';
import { ShopContext } from '@shared/context/ShopContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AccountSection from './components/AccountSection.web';
import CookieConsentBanner from './components/CookieConsentBanner.web';
import CookiePolicy from './pages/CookiePolicy.web';
import Spinner from './components/Spinner.web';

interface ProtectedRouteProps {
  children: ReactNode;
}

// Use optional chaining in case ShopContext is undefined
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const shopContext = useContext(ShopContext);
  return shopContext?.token ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  // Use optional chaining here as well
  const [isAppInitialized, setIsAppInitialized] = useState(true);

  // Simulate app initialization (e.g., for future OAuth or settings)
  useEffect(() => {
    setIsAppInitialized(false);
  }, []);

  if (isAppInitialized) return <Spinner />;

  return (
    <>
      {/* Use className instead of bodyClassName */}
      <ToastContainer
        className="p-2 rounded-lg shadow-soft font-sans"
        toastStyle={{ backgroundColor: '#f7f7f7', color: '#333333' }}
      />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/account" element={<AccountSection />} />
        <Route path="/profile/:id" element={<ProfileDetailPage />} />
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
        <Route path="/cookie-policy" element={<CookiePolicy />} />
        <Route
          path="/buy-tokens"
          element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieConsentBanner />
    </>
  );
};

export default App;
