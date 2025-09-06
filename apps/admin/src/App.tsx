// apps/admin/src/App.tsx
import React, { useCallback, useEffect, useState } from 'react';
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

// Theme support (same provider as apps/web)
import { ThemeProvider } from '@mytutorapp/shared/hooks';

// Use the concrete hook file to avoid barrel import ambiguity
import { useShopContext } from '@mytutorapp/shared/context/ShopContext';

export const currency = 'Kshs ';

/** Observe <html class="dark"> changes so we can sync Toastify theme */
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );

  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains('dark'));
    update();

    const observer = new MutationObserver(update);
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

/** Guard: only allow admins (or superadmins). Redirect everyone else to /login */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { initializing, token, role } = useShopContext();
  const loc = useLocation();

  if (initializing) return null;

  const isAdmin = role === 'admin' || role === 'superadmin';
  if (!token || !isAdmin) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  return <>{children}</>;
}

/** Shell shown for all authenticated admin pages */
function AdminShell() {
  const { token, setToken } = useShopContext();
  const isDark = useIsDark();

  // Adapter: make context.setToken look like React.Dispatch<SetStateAction<string>> (for Navbar prop)
  const setTokenDispatch = useCallback<React.Dispatch<React.SetStateAction<string>>>(
    (value) => {
      const next =
        typeof value === 'function'
          ? (value as (prev: string) => string)(token || '')
          : value;
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
  const { token } = useShopContext();

  return (
    <ThemeProvider applyToDocument storageKey="theme">
      <Routes>
        {/* Public login route (no admin chrome) */}
        <Route path="/login" element={<LoginChrome />} />

        {/* Protected admin routes */}
        <Route
          element={
            <RequireAdmin>
              <AdminShell />
            </RequireAdmin>
          }
        >
          <Route path="/" element={<Navigate to="/packages" replace />} />
          <Route path="/packages/create" element={<PackagesCreate token={token || ''} />} />
          <Route path="/packages" element={<PackagesManage token={token || ''} />} />
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
