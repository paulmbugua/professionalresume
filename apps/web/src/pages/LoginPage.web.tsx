'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, FileCheck2, FileText, Sparkles } from 'lucide-react';
import useAuth from '@mytutorapp/shared/hooks/useAuth';
import { useShopContext } from '@mytutorapp/shared/context';
import { getReturnToFromQuery } from '../lib/returnTo';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = useMemo(() => getReturnToFromQuery(searchParams, '/builder'), [searchParams]);
  const { token } = useShopContext() as any;

  const { loginWithEmail } = useAuth({
    navigateFn: (dest) => router.replace(dest || returnTo),
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const env = typeof process !== 'undefined' ? process.env : ({} as any);
  const hasGoogleConfig = Boolean(env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID);

  React.useEffect(() => {
    if (token) router.replace(returnTo || '/builder');
  }, [router, returnTo, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await loginWithEmail({ email: email.trim(), password });
      router.replace(returnTo || '/builder');
    } catch (err: any) {
      setError(err?.message || 'Unable to log in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#3b82f655,_transparent_40%),radial-gradient(circle_at_bottom_right,_#9333ea44,_transparent_35%)]" />
      <div className="absolute -left-10 top-8 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -right-10 bottom-8 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />

      <div className="relative z-10 grid w-full max-w-5xl gap-8 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-xl md:grid-cols-2 md:p-8 dark:bg-black/30">
        <section className="hidden flex-col justify-between rounded-2xl bg-black/20 p-8 md:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">CVPro</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight">Build an ATS-friendly CV in minutes.</h1>
            <p className="mt-4 text-sm text-white/75">Log in to access your drafts, premium templates, AI writing help, and one-click PDF export.</p>
          </div>
          <ul className="space-y-3 text-sm text-white/80">
            <li className="flex items-center gap-2"><FileText className="h-4 w-4" /> Professional template library</li>
            <li className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI-assisted content improvements</li>
            <li className="flex items-center gap-2"><FileCheck2 className="h-4 w-4" /> Print-ready PDF export + cloud storage</li>
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-6 text-gray-900 shadow-xl dark:bg-slate-900 dark:text-white">
          <p className="text-xs uppercase tracking-[0.26em] text-gray-500 dark:text-white/50">Welcome back</p>
          <h2 className="mt-2 text-2xl font-semibold">Log in to CVPro</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-white/60">Continue building resumes with live preview, drafts, and PDF export.</p>

          {error && <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/60">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-white/20 dark:bg-black/20" placeholder="you@cvpro.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/60">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary dark:border-white/20 dark:bg-black/20" placeholder="Your password" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-2 my-auto text-gray-500 dark:text-white/70">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="button" onClick={() => setEmail('demo@cvpro.local')} className="text-xs font-semibold text-primary hover:underline">Use demo account email (demo@cvpro.local)</button>

            <button type="submit" disabled={busy} className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {hasGoogleConfig && (
            <p className="mt-4 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-center text-xs text-gray-500 dark:border-white/20 dark:text-white/60">
              Google login is available in this environment via configured OAuth provider.
            </p>
          )}

          <p className="mt-6 text-center text-xs text-gray-500 dark:text-white/50">By continuing, you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.</p>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
