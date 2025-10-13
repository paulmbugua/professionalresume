// apps/web/src/pages/org/InviteLogin.web.tsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useAuth from '@mytutorapp/shared/hooks/useAuth';
import { useShopContext } from '@mytutorapp/shared/context';
import CustomGoogleLoginButton from '../../components/CustomGoogleLoginButton';

// If you already have a hook for invite info, use it:
import { useOrgInvite } from '@mytutorapp/shared/hooks'; // assumed existing on your side

type AuthMode = 'Login' | 'Sign Up';

const LOGIN_BG =
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=2000&auto=format&fit=crop';

const NEED_ROLE_FLAG = 'auth:needsRole';

const InviteLogin: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { token } = useShopContext();

  // --- Fetch invite / org name ------------------------------------------------
  // Adjust to your hook’s exact return shape
  const { data: inviteInfo, loading: inviteLoading } = (useOrgInvite?.(code!) ?? { data: null, loading: false }) as any;
  const orgName: string =
    inviteInfo?.org?.name ||
    inviteInfo?.org_name ||
    inviteInfo?.name ||
    'Your Institution';
  const orgLogo: string | null =
    inviteInfo?.org?.logo_url ||
    inviteInfo?.logo_url ||
    null;

  // --- Where to send users AFTER auth ----------------------------------------
  const backToInvite = useMemo(() => `/org/join/${code}`, [code]);

  // If already logged in, bounce straight back to invite landing
  useEffect(() => {
    if (token) {
      navigate(backToInvite, { replace: true });
    }
  }, [token, backToInvite, navigate]);

  // --- Auth wiring ------------------------------------------------------------
  const {
    // Google
    handleGoogleLoginSuccess,
    handleGoogleLoginFailure,
    // Email/password
    loginWithEmail,
    registerWithEmail,
    // Role finalize (for Google new users)
    completeRole,
    isRoleModalNeeded,
    getPendingJwt,
  } = useAuth({
    // Always go back to the invite landing after auth
    navigateFn: () => navigate(backToInvite, { replace: true }),
    alertFn: (msg) => console.log('[invite-auth]', msg),
  });

  // Auto-assign role=student for fresh Google accounts:
  // When the hook sets NEED_ROLE_FLAG + a pending JWT, finalize as student and return to invite
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const need = isRoleModalNeeded();
        const pending = getPendingJwt();
        if (need && pending) {
          await completeRole({ role: 'student' } as any);
          if (!alive) return;
          navigate(backToInvite, { replace: true });
          return; // stop after success
        }
      } catch {
        /* ignore and keep polling briefly */
      }
      if (alive) setTimeout(tick, 400);
    };
    // Short-lived poll that’s robust to timing of Google popup flow
    tick();

    // Also listen for localStorage flips (in case)
    const onStorage = () => {
      if (localStorage.getItem(NEED_ROLE_FLAG) === '1' && getPendingJwt()) {
        completeRole({ role: 'student' } as any)
          .then(() => navigate(backToInvite, { replace: true }))
          .catch(() => {/* ignore */});
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      alive = false;
      window.removeEventListener('storage', onStorage);
    };
  }, [isRoleModalNeeded, getPendingJwt, completeRole, navigate, backToInvite]);

  // --- Local UI state ---------------------------------------------------------
  const [authMode, setAuthMode] = useState<AuthMode>('Login');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const clearErrors = () => setError(null);

  const title = useMemo(() => {
    const prefix = authMode === 'Login' ? 'Sign in to' : 'Join';
    return `${prefix} ${orgName}`;
  }, [authMode, orgName]);

  // --- Submit handlers --------------------------------------------------------
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
        await loginWithEmail({ email: email.trim(), password });
        navigate(backToInvite, { replace: true });
        return;
      }

      // Sign Up — ALWAYS student for invites; leave age/country/language empty
      if (!name || !email || !password) {
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
        role: 'student',
      } as any);

      navigate(backToInvite, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  // --- UI ---------------------------------------------------------------------
  return (
    <div className="relative min-h-screen text-darkText dark:text-darkTextPrimary">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(16,26,35,0.35), rgba(16,26,35,0.65)), url("${LOGIN_BG}")`,
        }}
      />
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl dark:bg-secondary/25" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-softPink/20 blur-3xl" />

      <div className="relative mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-xl mx-auto rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm p-6 sm:p-8 lg:p-10 backdrop-blur-sm dark:bg-[#0f1821] dark:ring-darkCard">
          {/* Header — org brand */}
          <div className="flex items-center gap-3 justify-center mb-4">
            {orgLogo ? (
              <img
                src={orgLogo}
                alt={orgName}
                className="h-10 w-10 rounded-md object-contain ring-1 ring-black/10 dark:ring-white/10 bg-white"
              />
            ) : (
              <div className="h-10 w-10 rounded-md bg-white/80 ring-1 ring-black/10 dark:ring-white/10 flex items-center justify-center text-sm font-bold">
                {orgName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <h1 className="text-xl sm:text-2xl font-display font-bold text-center">
              {inviteLoading ? 'Loading…' : orgName}
            </h1>
          </div>

          {/* Title */}
          <h2 className="text-lg sm:text-xl font-semibold text-center mb-6">
            {title}
          </h2>

          {/* Error banner */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="mb-5 grid grid-cols-2 gap-2">
            {(['Login', 'Sign Up'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { clearErrors(); setAuthMode(m); }}
                className={`h-10 rounded-xl text-sm font-medium ring-1 ring-white/10 ${
                  authMode === m ? 'bg-white/15 dark:bg-white/10' : 'bg-white/10 hover:bg-white/15 dark:bg-white/5 hover:dark:bg-white/10'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4">
            {authMode === 'Sign Up' && (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="Full name"
                required
              />
            )}

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="Email"
              required
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder={authMode === 'Login' ? 'Password' : 'Create a password'}
              required
            />

            {authMode === 'Sign Up' && (
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Confirm password"
                required
              />
            )}

            <button
              type="submit"
              disabled={busy}
              className={`inline-flex items-center justify-center rounded-xl h-11 px-5 w-full bg-primary text-white font-semibold shadow-sm hover:shadow transition active:translate-y-[1px] ${busy ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {authMode === 'Login' ? 'Login' : 'Create account'}
            </button>

            {authMode === 'Login' && (
              <div className="flex justify-between text-sm">
                <Link to="/login" className="link">Forgot password?</Link>
                <button
                  type="button"
                  onClick={() => { clearErrors(); setAuthMode('Sign Up'); }}
                  className="link"
                >
                  Create account
                </button>
              </div>
            )}
            {authMode === 'Sign Up' && (
              <div className="text-right text-sm">
                <button
                  type="button"
                  onClick={() => { clearErrors(); setAuthMode('Login'); }}
                  className="link"
                >
                  Already have an account?
                </button>
              </div>
            )}
          </form>

          {/* Divider / Google */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-darkCard" />
            <span className="text-xs text-mutedGray dark:text-darkTextSecondary">OR</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-darkCard" />
          </div>
          <div className="flex justify-center">
            <CustomGoogleLoginButton
              onSuccess={handleGoogleLoginSuccess}
              onFailure={handleGoogleLoginFailure}
            />
          </div>

          {/* Fine print */}
          <p className="mt-6 text-center text-[11px] text-mutedGray dark:text-darkTextSecondary">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-primary">Terms</Link> &{' '}
            <Link to="/privacy-policy" className="underline hover:text-primary">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InviteLogin;
