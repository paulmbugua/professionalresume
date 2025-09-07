// apps/admin/src/pages/AdminLogin.tsx
import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { useShopContext } from '@mytutorapp/shared/context/ShopContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ShieldCheck,
  Lock,
  Activity,
  Server,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

type AdminLoginResponse = { token: string; role?: 'admin' | 'superadmin'; message?: string };

const tryLogin = async (base: string, email: string, password: string) => {
  // 1) New DB-backed login
  try {
    const { data } = await axios.post<AdminLoginResponse>(
      `${base}/api/auth/login`,
      { email, password },
      { withCredentials: true }
    );
    if (data?.token) return { ok: true as const, data };
  } catch {
    // continue to next attempt
  }

  // 2) Legacy (if still present) — keep for compatibility
  try {
    const { data } = await axios.post<AdminLoginResponse>(
      `${base}/api/admin/login`,
      { email, password },
      { withCredentials: true }
    );
    if (data?.token) return { ok: true as const, data };
  } catch {
    // continue to next attempt
  }

  // 3) ENV bootstrap superadmin/admin
  try {
    const { data } = await axios.post<AdminLoginResponse>(
      `${base}/api/auth/admin-env-login`,
      { email, password },
      { withCredentials: true }
    );
    if (data?.token) return { ok: true as const, data };
  } catch {
    // throw below
  }

  return { ok: false as const, error: 'Invalid credentials' };
};

export default function AdminLogin() {
  const { backendUrl, setToken, refreshUserDetails } = useShopContext();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [showPw, setShowPw] = useState<boolean>(false);
  const nav = useNavigate();
  const emailRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!backendUrl) {
      toast.error('Backend URL is not configured.');
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.error('Please enter your email and password.');
      return;
    }

    try {
      setBusy(true);
      const base = backendUrl.replace(/\/+$/, '');
      const result = await tryLogin(base, trimmedEmail, password);

      if (!result.ok || !result.data?.token) {
        throw new Error(result.error || 'Login failed');
      }

      await setToken(result.data.token);

      // Ensure context re-renders with the new token before fetching user details.
      await new Promise((r) => setTimeout(r, 0));
      await refreshUserDetails();

      const roleText = result.data.role ? ` (${result.data.role})` : '';
      toast.success(`Welcome back${roleText}!`);
      nav('/transactions');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Login failed';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-[100vh] flex items-center justify-center px-4 py-10 bg-gradient-to-br from-slate-50 to-white dark:from-[#0B0E14] dark:to-[#0B0E14]">
      {/* Theme toggle — top-right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Shell */}
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6 md:gap-8 items-stretch">
        {/* Left: Login panel */}
        <form
          onSubmit={onSubmit}
          className="panel p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100/70 dark:border-darkCard bg-white/80 dark:bg-darkCard/70 backdrop-blur"
          aria-label="Admin login form"
        >
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              <h2 className="app-heading">Admin Console</h2>
            </div>
            <p className="text-sm text-mutedGray dark:text-darkTextSecondary mt-1">
              Sign in with your administrator credentials to access packages,
              users, transactions, and receipts.
            </p>
          </div>

          <label className="block mb-4">
            <span className="text-sm">Email</span>
            <input
              ref={emailRef}
              className="input mt-1"
              type="email"
              placeholder="admin@company.com"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              required
            />
          </label>

          <label className="block mb-2">
            <span className="text-sm">Password</span>
            <div className="relative mt-1">
              <input
                className="input pr-10"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                required
              />
              <button
                type="button"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw((s) => !s)}
                className="absolute inset-y-0 right-2 flex items-center justify-center px-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                tabIndex={-1}
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between mb-6">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" className="accent-violet-600" disabled />
              <span className="text-mutedGray dark:text-darkTextSecondary">
                Remember this device
              </span>
            </label>
            <span className="text-xs text-mutedGray dark:text-darkTextSecondary opacity-70">
              SSO available on enterprise plans
            </span>
          </div>

          <button
            className="btn w-full flex items-center justify-center gap-2"
            type="submit"
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-lg border border-gray-100 dark:border-darkCard p-3">
              <div className="flex items-center gap-2 font-medium">
                <Lock className="w-4 h-4 text-emerald-600" />
                Secure
              </div>
              <p className="mt-1 text-mutedGray dark:text-darkTextSecondary">
                TLS, hashed credentials, and IP throttling protect access.
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-darkCard p-3">
              <div className="flex items-center gap-2 font-medium">
                <Activity className="w-4 h-4 text-amber-600" />
                Audited
              </div>
              <p className="mt-1 text-mutedGray dark:text-darkTextSecondary">
                Every admin action is logged with time, IP, and user.
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-darkCard p-3">
              <div className="flex items-center gap-2 font-medium">
                <Server className="w-4 h-4 text-sky-600" />
                Resilient
              </div>
              <p className="mt-1 text-mutedGray dark:text-darkTextSecondary">
                Redundant replicas and daily encrypted backups.
              </p>
            </div>
          </div>
        </form>

        {/* Right: brand / context panel */}
        <aside className="hidden md:flex panel p-8 rounded-2xl shadow-lg border border-gray-100/70 dark:border-darkCard bg-white/60 dark:bg-darkCard/60 backdrop-blur flex-col justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
              DayBreak Learner • Admin
            </h3>
            <p className="mt-2 text-sm text-mutedGray dark:text-darkTextSecondary">
              Manage prices and packages, review transactions, generate receipts,
              and keep your platform humming. Only authorized staff are permitted.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-gray-700 dark:text-darkTextPrimary">
              <li className="flex items-center gap-2">
                <span className="chip chip-active">Packages</span>
                Create, edit, and run offers across USD &amp; KES.
              </li>
              <li className="flex items-center gap-2">
                <span className="chip">Transactions</span>
                Unified feed for purchases &amp; tutor withdrawals.
              </li>
              <li className="flex items-center gap-2">
                <span className="chip">Receipts</span>
                Generate PDF proof of fulfillment instantly.
              </li>
              <li className="flex items-center gap-2">
                <span className="chip">Users</span>
                Audit user states, tokens, and roles.
              </li>
            </ul>
          </div>

          <div className="mt-8 text-xs text-mutedGray dark:text-darkTextSecondary">
            By continuing, you agree to the acceptable use and administrative
            access policy. All access attempts are monitored.
          </div>
        </aside>
      </div>
    </div>
  );
}
