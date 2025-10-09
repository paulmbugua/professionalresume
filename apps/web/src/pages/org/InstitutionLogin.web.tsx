// apps/web/src/pages/org/InstitutionLogin.web.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useInstitutionAuth from '@mytutorapp/shared/hooks/useInstitutionAuth';
import CustomGoogleLoginButton from '../../components/CustomGoogleLoginButton';
import { useShopContext } from '@mytutorapp/shared/context';
import { acceptOrgInvite } from '@mytutorapp/shared/api';

const LOGIN_BG =
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=2000&auto=format&fit=crop';

type AuthMode = 'Login' | 'Sign Up';
type ResetMode = 'idle' | 'requesting' | 'verifying';

const InstitutionLogin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { backendUrl, orgToken, logout } = useShopContext() as any;
  const ran = React.useRef(false);

  // ——— Helpers ———
  // Map bare "/org" to "/org/profile" but keep invite flows intact
  const normalizeOrgNext = (v?: string) => {
    if (!v) return v;
    // Preserve invite/deep links
    if (/^\/org\/join\/[^/]+/.test(v) || /[?&]assignmentId=/.test(v)) return v;
    // Normalize plain /org to /org/profile
    return /^\/org\/?$/.test(v) ? '/org/profile' : v;
  };

  // —— Unified Return-to handling (invites, deep-links, etc.) —— //
  const RETURN_TO_PRIMARY = 'auth:returnTo';
  const RETURN_TO_ALIASES = [RETURN_TO_PRIMARY, 'auth:returnTo:org']; // read legacy

  // DEFAULT to /org/profile
  const computeNextFromLocation = (loc: any) => {
    const raw =
      (typeof loc?.state?.next === 'string' && loc.state.next) ||
      (new URLSearchParams(loc?.search || '').get('next')) ||
      '/org/profile';
    return normalizeOrgNext(raw) || '/org/profile';
  };

  const writeReturnTo = (v: string) => sessionStorage.setItem(RETURN_TO_PRIMARY, v);

  // Read with /org/profile fallback + normalization
  const readReturnTo = () => {
    for (const k of RETURN_TO_ALIASES) {
      const v = sessionStorage.getItem(k);
      const n = normalizeOrgNext(v || undefined);
      if (n) return n;
    }
    return '/org/profile';
  };

  const clearReturnTo = () => RETURN_TO_ALIASES.forEach((k) => sessionStorage.removeItem(k));

  // Capture intended target on mount (defaults to /org/profile now)
  useEffect(() => {
    const next = computeNextFromLocation(location);
    if (next) writeReturnTo(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    handleGoogleLoginSuccess,
    handleGoogleLoginFailure,
    loginWithEmail,
    registerWithEmail,
    sendResetOTP,
    resetPasswordWithOTP,
  } = useInstitutionAuth({
    alertFn: (msg) => console.log('[auth]', msg),
    navigateFn: (dest) => {
      // Saved returnTo wins; default to /org/profile.
      const saved = readReturnTo();
      const target = saved || normalizeOrgNext(dest) || '/org/profile';
      clearReturnTo();
      navigate(target, { replace: true });
    },
  });

  // Auto-accept invite after org auth to cement role=learner
useEffect(() => {
  if (ran.current || !orgToken) return;
  const saved = sessionStorage.getItem('auth:returnTo') || '';
  const m = saved.match(/\/org\/join\/([^/?#]+)/);
  const roleHint = sessionStorage.getItem('org:roleHint');

  if (m && roleHint === 'learner') {
    ran.current = true;
    const code = m[1];
    (async () => {
      try { await acceptOrgInvite(backendUrl, orgToken, code); } catch {}
      // Clear sticky hint + returnTo now that we’re going back
      sessionStorage.removeItem('org:roleHint');
      sessionStorage.removeItem('auth:returnTo'); // optional but prevents loops
      navigate(saved, { replace: true });
    })();
  }
}, [orgToken, backendUrl, navigate]);

// If already logged in and someone visits /org/login, bounce — unless handling an invite
useEffect(() => {
  if (!orgToken) return;
  const saved = readReturnTo();
  const isInvite = /^\/org\/join\//.test(saved || '');
  const roleHint = sessionStorage.getItem('org:roleHint');
  if (isInvite && roleHint === 'learner') return; // let the auto-accept effect above do it
  const target = saved || '/org/profile';
  clearReturnTo();
  navigate(target, { replace: true });
}, [orgToken, navigate]);



  // —— Local state —— //
  const [authMode, setAuthMode] = useState<AuthMode>('Login');
  const [resetMode, setResetMode] = useState<ResetMode>('idle');
  const [otpSent, setOtpSent] = useState(false);

  const [name, setName] = useState(''); // sign-up only
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearErrors = () => setError(null);

  

  const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  clearErrors();
  try {
    setBusy(true);
    if (authMode === 'Login') {
      if (!email || !password) {
        setError('Please enter email and password.');
        return;
      }

      // ⬇️ expect the hook to return the org JWT
      await loginWithEmail({ email: email.trim(), password });

    } else {
      if (!name || !email || !password || !confirmPassword) {
        setError('Please fill all required fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }

      // ⬇️ expect the hook to return the org JWT on sign-up too
      await registerWithEmail({
        name: name.trim(),
        email: email.trim(),
        password,
        role: 'tutor',
      } as any);

      
    }

    // ⚠️ Do not navigate here — your hook already calls navigateFn
  } catch (err: any) {
    setError(err?.message || 'Authentication failed');
  } finally {
    setBusy(false);
  }
};


  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!email) {
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
    if (!email || !otp || !newPassword) {
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
      setOtp('');
      setNewPassword('');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  };

  const goToUserLogin = React.useCallback(async () => {
  try {
    // Avoid sticky org redirects
    sessionStorage.removeItem('auth:returnTo');
    sessionStorage.removeItem('auth:returnTo:org');

    sessionStorage.removeItem('org:roleHint');

    // Flip to user mode
    localStorage.setItem('auth:mode', 'user');

    // Proactively clear any existing USER token so /login isn't bounced
    if (typeof logout === 'function') {
      await logout().catch(() => {});
    }
  } catch {}
  // Force login page even if a token exists
  navigate('/login?forceLogin=1', { replace: true });
}, [logout, navigate]);

  const onGoogleSuccess = useCallback(
    async (idToken: string) => {
    await handleGoogleLoginSuccess(idToken, name || undefined);
    },
    [handleGoogleLoginSuccess, name]
  );

  const onGoogleFailure = useCallback(
    (err?: Error) => {
      handleGoogleLoginFailure(err);
    },
    [handleGoogleLoginFailure]
  );

  const primaryBtn =
    'inline-flex items-center justify-center rounded-xl h-11 px-5 bg-indigo-600 text-white font-semibold shadow-sm hover:shadow transition active:translate-y-[1px]';

  const emailFormTitle = useMemo(
    () => (authMode === 'Login' ? 'Institution Login' : 'Create your Institution account'),
    [authMode]
  );

  return (
    <div className="relative min-h-screen overflow-hidden text-darkText dark:text-darkTextPrimary">
      {/* BG */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(16,26,35,0.35), rgba(16,26,35,0.65)), url("${LOGIN_BG}")`,
        }}
      />

      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-400/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

      {/* Content */}
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Left: copy for institutions (desktop only) */}
          <aside className="hidden md:flex md:col-span-6">
            <div className="w-full rounded-2xl p-8 lg:p-10 bg-white/70 ring-1 ring-gray-200 shadow-sm backdrop-blur-sm dark:bg-[#0f1821]/70 dark:ring-darkCard">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 text-indigo-600">
                  <svg viewBox="0 0 48 48" fill="currentColor" className="h-full w-full" aria-hidden>
                    <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" />
                  </svg>
                </span>
                <h1 className="text-2xl font-display font-bold">Institution Access</h1>
              </div>

              <p className="mt-4 text-sm text-gray-700 dark:text-darkTextSecondary">
                Manage branding, assignments, analytics, and reporting for your organization in one place.
              </p>

              <ul className="mt-6 space-y-3 text-sm">
                <li>• Custom certificates &amp; branding</li>
                <li>• Timed assignments &amp; pass marks</li>
                <li>• Monthly / termly / yearly analytics</li>
              </ul>

              <div className="mt-8 rounded-xl bg-gradient-to-br from-indigo-200/30 to-cyan-200/30 p-4 ring-1 ring-indigo-200/40">
                <p className="text-sm">
                  “Rolling out courses to our cohort took minutes. The analytics saved our admin team hours.” —{' '}
                  <span className="font-semibold">Program Director</span>
                </p>
              </div>

              {/* Desktop-only helper link */}
            <div className="mt-8 text-sm">
              Not an institution?{' '}
              <button type="button" onClick={goToUserLogin} className="underline hover:text-indigo-600">
                Sign in as Student/Tutor
              </button>
            </div>

            </div>
          </aside>

          {/* Right: auth card */}
          <section className="md:col-span-6 flex">
            <div className="w-full rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm p-6 sm:p-8 lg:p-10 backdrop-blur-sm dark:bg-[#0f1821] dark:ring-darkCard">
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200 px-3 py-2 text-sm">
                  {error}
                </div>
              )}

              {/* Forms */}
              {resetMode !== 'idle' ? (
                otpSent ? (
                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <h2 className="text-xl font-display font-semibold text-center">Enter OTP</h2>
                    <input
                      className="input"
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                    />
                    <input
                      className="input"
                      placeholder="New Password (min. 8 characters)"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="h-11 px-4 rounded-xl border border-black/10 dark:border-white/10"
                        onClick={() => {
                          setResetMode('idle');
                          setOtpSent(false);
                          setError(null);
                        }}
                      >
                        Back
                      </button>
                      <button type="submit" className={`${primaryBtn} flex-1`}>
                        Reset Password
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSendOtp} className="space-y-5">
                    <h2 className="text-xl font-display font-semibold text-center">Reset Password</h2>
                    <input
                      className="input"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="h-11 px-4 rounded-xl border border-black/10 dark:border-white/10"
                        onClick={() => {
                          setResetMode('idle');
                          setError(null);
                        }}
                      >
                        Back
                      </button>
                      <button type="submit" className={`${primaryBtn} flex-1`}>
                        Send OTP
                      </button>
                    </div>
                  </form>
                )
              ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                  <h2 className="text-xl font-display font-semibold text-center">{emailFormTitle}</h2>

                  {authMode === 'Sign Up' && (
                    <input
                      className="input"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  )}
                  <input
                    className="input"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <input
                    className="input"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  {authMode === 'Sign Up' && (
                    <input
                      className="input"
                      type="password"
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className={`${primaryBtn} w-full ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {authMode === 'Login' ? 'Login' : 'Sign Up'}
                  </button>

                  <div className="flex justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        clearErrors();
                        setResetMode('requesting');
                      }}
                      className="link"
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
                        className="link"
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
                        className="link"
                      >
                        Already have an account?
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* Divider / Google */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200 dark:bg-darkCard" />
                <span className="text-xs text-gray-500 dark:text-darkTextSecondary">OR</span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-darkCard" />
              </div>
              <div className="flex justify-center">
                <CustomGoogleLoginButton onSuccess={onGoogleSuccess} onFailure={onGoogleFailure} />
              </div>

              {/* Mobile-only helper link so phone users see it */}
              <div className="mt-6 text-center text-sm md:hidden">
                Not an institution?{' '}
                <button type="button" onClick={goToUserLogin} className="underline hover:text-indigo-600">
                  Sign in as Student/Tutor
                </button>
              </div>


              <p className="mt-6 text-center text-xs text-gray-500 dark:text-darkTextSecondary">
                By continuing, you agree to our{' '}
                <Link to="/terms" className="underline hover:text-indigo-600">
                  Terms
                </Link>{' '}
                and{' '}
                <Link to="/privacy-policy" className="underline hover:text-indigo-600">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default InstitutionLogin;
