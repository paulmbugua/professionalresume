'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, FileCheck2, FileText, Sparkles } from 'lucide-react';

import useAuth from '@cvpro/shared/hooks/useAuth';
import { useShopContext } from '@cvpro/shared/context';
import CustomGoogleButtonLogin from '@/components/auth/CustomGoogleButtonLogin.web';
import { getReturnToFromQuery } from '../lib/returnTo';
import { trackLogin, trackSignUp } from '../lib/analytics/events';

type AuthMode = 'Login' | 'Sign Up';
type ResetMode = 'idle' | 'requesting' | 'verifying';

const DEFAULT_RETURN_TO = '/builder';
const RETURN_TO_SS_KEY = 'auth:returnTo';
const CV_AUTH_REASON_SS_KEY = 'auth:cvReason';

/**
 * Avoid open redirects.
 * - Allow only internal paths like "/builder", "/templates"
 * - Disallow "https://evil.com", "//evil.com", "javascript:..."
 */
const sanitizeInternalPath = (raw?: string | null) => {
  const s = (raw || '').trim();
  if (!s) return DEFAULT_RETURN_TO;

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return DEFAULT_RETURN_TO;
  if (s.startsWith('//')) return DEFAULT_RETURN_TO;
  if (!s.startsWith('/')) return DEFAULT_RETURN_TO;

  return s.replace(/\/{2,}/g, '/');
};

const safeSessionGet = (k: string) => {
  try {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(k);
  } catch {
    return null;
  }
};
const safeSessionSet = (k: string, v: string) => {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(k, v);
  } catch {}
};
const safeSessionRemove = (k: string) => {
  try {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(k);
  } catch {}
};

const emailHash = (email: string) => {
  try {
    return btoa(email.trim().toLowerCase());
  } catch {
    return email.trim().toLowerCase();
  }
};

const LoginPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const computedReturnTo = useMemo(
    () => sanitizeInternalPath(getReturnToFromQuery(searchParams, DEFAULT_RETURN_TO)),
    [searchParams]
  );

  useEffect(() => {
    safeSessionSet(RETURN_TO_SS_KEY, computedReturnTo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getReturnTo = useCallback(() => {
    return sanitizeInternalPath(safeSessionGet(RETURN_TO_SS_KEY)) || DEFAULT_RETURN_TO;
  }, []);
  const clearReturnTo = useCallback(() => safeSessionRemove(RETURN_TO_SS_KEY), []);

  const { token } = useShopContext() as any;

  const {
    handleGoogleLoginSuccess,
    handleGoogleLoginFailure,
    loginWithEmail,
    registerWithEmail,
    sendResetOTP,
    resetPasswordWithOTP,
  } = useAuth({
    navigateFn: (dest) => {
      const target = sanitizeInternalPath(dest || getReturnTo());
      clearReturnTo();
      router.replace(target);
    },
  });

  useEffect(() => {
    if (token) router.replace(getReturnTo() || DEFAULT_RETURN_TO);
  }, [router, token, getReturnTo]);

  const [authMode, setAuthMode] = useState<AuthMode>('Login');
  const [resetMode, setResetMode] = useState<ResetMode>('idle');
  const [otpSent, setOtpSent] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authReason, setAuthReason] = useState<string>('');

  useEffect(() => {
    const reason = safeSessionGet(CV_AUTH_REASON_SS_KEY) || '';
    if (reason) setAuthReason(reason);
  }, []);

  const clearErrors = () => setError(null);

  const emailFormTitle = useMemo(
    () => (authMode === 'Login' ? 'Log in to CVPro' : 'Create your CVPro account'),
    [authMode]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    try {
      setBusy(true);

      if (authMode === 'Login') {
        if (!email || !password) {
          setError('Please enter email and password.');
          return;
        }
        await loginWithEmail({ email: email.trim(), password });
        trackLogin({ auth_method: 'email', source_page: computedReturnTo });
        router.replace(getReturnTo() || DEFAULT_RETURN_TO);
        return;
      }

      if (!name.trim() || !email.trim() || !password) {
        setError('Please fill all required fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      await registerWithEmail({
        name: name.trim(),
        email: email.trim(),
        password,
      } as any);

      trackSignUp({ auth_method: 'email', source_page: computedReturnTo });
      router.replace(getReturnTo() || DEFAULT_RETURN_TO);
    } catch (err: any) {
      setError(err?.message || 'Unable to authenticate.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!email.trim()) {
      setError('Please enter your account email.');
      return;
    }

    try {
      setBusy(true);
      await sendResetOTP(email.trim());
      setOtpSent(true);
      setResetMode('verifying');
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!email.trim() || !otp.trim() || !newPassword) {
      setError('Please fill all fields.');
      return;
    }

    try {
      setBusy(true);
      await resetPasswordWithOTP(email.trim(), otp.trim(), newPassword);

      setResetMode('idle');
      setOtpSent(false);
      setAuthMode('Login');

      setPassword('');
      setConfirmPassword('');
      setOtp('');
      setNewPassword('');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f3f6ff] px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.16),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(147,51,234,0.14),_transparent_40%)] dark:bg-[radial-gradient(circle_at_top,_#3b82f655,_transparent_40%),radial-gradient(circle_at_bottom_right,_#9333ea44,_transparent_35%)]" />
      <div className="absolute -left-10 top-8 h-56 w-56 rounded-full bg-primary/15 blur-3xl dark:bg-primary/20" />
      <div className="absolute -right-10 bottom-8 h-64 w-64 rounded-full bg-fuchsia-400/15 blur-3xl dark:bg-fuchsia-500/20" />

      <div className="relative z-10 grid w-full max-w-5xl gap-8 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-2xl backdrop-blur-xl md:grid-cols-2 md:p-8 dark:border-white/10 dark:bg-black/30">
        <section className="hidden flex-col justify-between rounded-2xl bg-slate-900/85 p-8 text-white md:flex dark:bg-black/20">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">CVPro</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">
              Build an ATS-friendly CV in minutes.
            </h1>
            <p className="mt-4 text-sm text-white/75">
              Log in to access your drafts, premium templates, AI writing help, and one-click PDF
              export.
            </p>

            <div className="mt-5 flex justify-center">
              <div className="relative w-full max-w-[250px] overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2">
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src="/assets/ladywithcv.png"
                    alt="Lady holding a CV"
                    fill
                    priority
                    className="object-contain"
                    sizes="250px"
                  />
                </div>
              </div>
            </div>
          </div>

          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Professional template library
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> AI-assisted content improvements
            </li>
            <li className="flex items-center gap-2">
              <FileCheck2 className="h-4 w-4" /> Print-ready PDF export + cloud storage
            </li>
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-6 text-gray-900 shadow-xl dark:bg-slate-900 dark:text-white">
          <p className="text-xs uppercase tracking-[0.26em] text-gray-500 dark:text-white/50">
            Welcome back
          </p>
          <h2 className="mt-2 text-2xl font-semibold">{emailFormTitle}</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-white/60">
            Continue building resumes with live preview, drafts, and PDF export.
          </p>

          {authReason && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              {authReason}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          )}

          {resetMode !== 'idle' ? (
            otpSent ? (
              <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/60">
                    OTP
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-white/20 dark:bg-black/20"
                    placeholder="Enter OTP"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/60">
                    New password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-white/20 dark:bg-black/20"
                    placeholder="New password (min. 8 characters)"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="w-1/2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/20 dark:bg-black/20 dark:text-white"
                    onClick={() => {
                      setResetMode('idle');
                      setOtpSent(false);
                      setError(null);
                      setOtp('');
                      setNewPassword('');
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-1/2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/60">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-white/20 dark:bg-black/20"
                    placeholder="you@cvpro.com"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="w-1/2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/20 dark:bg-black/20 dark:text-white"
                    onClick={() => {
                      setResetMode('idle');
                      setError(null);
                    }}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-1/2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? 'Sending...' : 'Send OTP'}
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {authMode === 'Sign Up' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/60">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-white/20 dark:bg-black/20"
                    placeholder="Your name"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/60">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-white/20 dark:bg-black/20"
                  placeholder="you@cvpro.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/60">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary dark:border-white/20 dark:bg-black/20"
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 my-auto text-gray-500 dark:text-white/70"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {authMode === 'Sign Up' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/60">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-white/20 dark:bg-black/20"
                    placeholder="Confirm password"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy
                  ? authMode === 'Login'
                    ? 'Signing in...'
                    : 'Creating account...'
                  : authMode === 'Login'
                    ? 'Sign in'
                    : 'Sign up'}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    clearErrors();
                    setResetMode('requesting');
                  }}
                  className="font-semibold text-gray-500 hover:underline dark:text-white/60"
                >
                  Forgot password?
                </button>

                {authMode === 'Login' ? (
                  <button
                    type="button"
                    onClick={() => {
                      clearErrors();
                      setAuthMode('Sign Up');
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Create account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      clearErrors();
                      setAuthMode('Login');
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Already have an account?
                  </button>
                )}
              </div>
            </form>
          )}

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-white/15" />
            <span className="text-xs text-gray-400 dark:text-white/40">OR</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-white/15" />
          </div>

          <div className="flex justify-center">
            <CustomGoogleButtonLogin
              onSuccess={async (token) => {
                await handleGoogleLoginSuccess(token);
                trackLogin({ auth_method: 'google', source_page: computedReturnTo });
              }}
              onFailure={handleGoogleLoginFailure}
              mode="consumer"
              returnTo={getReturnTo()}
            />
          </div>

          <p className="mt-6 text-center text-xs text-gray-500 dark:text-white/50">
            By continuing, you agree to our{' '}
            <Link href="/fulfillment" className="underline">
              Fulfillment Policy
            </Link>{' '}
            and{' '}
            <Link href="/cookie-policy" className="underline">
              Cookie Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;