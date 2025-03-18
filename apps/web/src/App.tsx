import React, { useContext, useState, useEffect, ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProfileDetailPage from './pages/ProfileDetailPage';
import Messages from './pages/Messages';
import Settings from './pages/Settings';
import CreateProfileForm from './components/CreateProfileForm';
import ManageProfileForm from './components/ManageProfileForm';
import PaymentPage from './pages/PaymentPage';
import { ShopContext } from "@shared/context/ShopContext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AccountSection from './components/AccountSection';
import CookieConsentBanner from './components/CookieConsentBanner';
import CookiePolicy from './pages/CookiePolicy';
import Spinner from './components/Spinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

// A simple protected route wrapper to guard against unauthorized access
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { token } = useContext(ShopContext);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  const { token } = useContext(ShopContext)!;
  const [isAppInitialized, setIsAppInitialized] = useState(true);

  // Simulate app initialization (e.g., for future OAuth or settings)
  useEffect(() => {
    setIsAppInitialized(false);
  }, []);

  if (isAppInitialized) return <Spinner />;

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID as string}>
      <>
        <ToastContainer
          toastClassName="p-2 rounded-lg shadow-soft"
          bodyClassName="font-sans"
          toastStyle={{ backgroundColor: '#f7f7f7', color: '#333333' }}
        />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<AccountSection />} />
          <Route path="/profile/:id" element={<ProfileDetailPage />} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/settings/create" element={<ProtectedRoute><CreateProfileForm /></ProtectedRoute>} />
          <Route path="/settings/manage" element={<ProtectedRoute><ManageProfileForm /></ProtectedRoute>} />
          <Route path="/settings/account" element={<ProtectedRoute><AccountSection /></ProtectedRoute>} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/buy-tokens" element={<ProtectedRoute><PaymentPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <CookieConsentBanner />
      </>
    </GoogleOAuthProvider>
  );
};

export default App;
