// apps/admin/src/App.tsx
import React, { useCallback } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import PackagesCreate from './pages/PackagesCreate';
import PackagesManage from './pages/PackagesManage';
import Transactions from './pages/Transactions';
import Receipts from './pages/Receipts';
import Users from './pages/Users';
import AdminLogin from './pages/AdminLogin';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from '@mytutorapp/shared/hooks';
import { useShopContext } from '@mytutorapp/shared/context/ShopContext';
import { Loader2 } from 'lucide-react';

/** Small full-screen splash while auth is rehydrating */
function AuthSplash() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-sm text-mutedGray dark:text-darkTextSecondary">
      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      Checking admin access…
    </div>
  );
}

/** Observe <html class="dark"> changes so we can sync Toastify theme */
function useIsDark(): boolean {
  const [isDark, setIsDark] = React.useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );
  React.useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains('dark'));
    update();
    const observer = new MutationObserver(update);
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return isDark;
}

// Simple role ranking helper
const roleRank: Record<string, number> = {
  student: 0,
  tutor: 1,
  admin: 2,
  superadmin: 3,
};
function hasRoleAtLeast(current: string | null | undefined, required: 'admin' | 'superadmin') {
  if (!current) return false;
  return (roleRank[current] ?? -1) >= roleRank[required];
}

/**
 * Generic guard: wait for context to initialize; if a token exists but role isn't
 * known yet, show a splash; then enforce minRole.
 */
function RequireRole({
  minRole,
  children,
}: {
  minRole: 'admin' | 'superadmin';
  children: React.ReactNode;
}) {
  const { initializing, token, role } = useShopContext();
  const loc = useLocation();

  // Fallbacks from localStorage to avoid redirect flicker on hard refresh
  const lsToken =
    (typeof window !== 'undefined' &&
      (localStorage.getItem('token') || localStorage.getItem('authToken'))) || '';
  const lsRole =
    (typeof window !== 'undefined' && (localStorage.getItem('role') || '')) || '';

  const effectiveToken = token || lsToken || '';
  const effectiveRole = (role ?? (lsRole || null)) as 'student' | 'tutor' | 'admin' | 'superadmin' | null;

  // No token at all → login
  if (!effectiveToken) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  // Still initializing or role not known yet → splash
  if (initializing || !effectiveRole) {
    return <AuthSplash />;
  }

  // Role known but insufficient → login
  if (!hasRoleAtLeast(effectiveRole, minRole)) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  return <>{children}</>;
}

/** Shell shown for all authenticated admin pages */
function AdminShell() {
  const { token, setToken } = useShopContext();
  const isDark = useIsDark();

  // Adapter for Navbar prop
  const setTokenDispatch = useCallback<React.Dispatch<React.SetStateAction<string>>>(
    (value) => {
      const next = typeof value === 'function' ? (value as (prev: string) => string)(token || '') : value;
      void setToken(next);
    },
    [setToken, token]
  );

  return (
    <div className="app-body min-h-screen">
      <ToastContainer theme={isDark ? 'dark' : 'light'} />
      <Navbar setToken={setTokenDispatch} />
      <hr className="border-gray-200 dark:border-darkCard" />
      <div className="flex w-full">
        <Sidebar />
        <main className="w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 dark:text-darkTextPrimary text-base">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function LoginChrome() {
  const isDark = useIsDark();
  return (
    <div className="app-body min-h-screen">
      <ToastContainer theme={isDark ? 'dark' : 'light'} />
      <AdminLogin />
    </div>
  );
}

const App: React.FC = () => {
  return (
    <ThemeProvider applyToDocument storageKey="theme">
      <Routes>
        {/* Public login route (no admin chrome) */}
        <Route path="/login" element={<LoginChrome />} />

        {/* Protected admin routes (admin or superadmin) */}
        <Route
          element={
            <RequireRole minRole="admin">
              <AdminShell />
            </RequireRole>
          }
        >
          <Route path="/" element={<Navigate to="/packages" replace />} />
          <Route path="/packages/create" element={<PackagesCreate />} />
          <Route path="/packages" element={<PackagesManage />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/receipts" element={<Receipts />} />
          <Route path="/users" element={<Users />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/packages" replace />} />
      </Routes>
    </ThemeProvider>
  );
};

export default App;
