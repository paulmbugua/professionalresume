'use client';

import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { useRouter } from 'next/navigation';
import {
  debugFirebaseWebConfig,
  getWebFirebaseConfigOrNull,
  signInGooglePopup,
} from '../../utils/firebaseAuthWeb';

type LoginMode = 'consumer' | 'institution';

const REDIRECT_MARKER = 'auth:googleRedirect';
const REDIRECT_STARTED = 'auth:googleRedirect:started';
const BUSY_KEY = 'auth:busy';

const CONFIG_MISSING_MESSAGE =
  'Google login is not available in this environment (missing web config). Please contact support.';

export default function CustomGoogleButtonLogin({
  onSuccess,
  onFailure,
  mode = 'consumer',
  returnTo,
  className,
}: {
  onSuccess: (idToken: string) => Promise<void>;
  onFailure: (error?: Error) => void;
  mode?: LoginMode;
  returnTo?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const startRedirectFlow = () => {
    try {
      sessionStorage.setItem(REDIRECT_MARKER, '1');
      sessionStorage.setItem(BUSY_KEY, '1');
      sessionStorage.removeItem(REDIRECT_STARTED);
    } catch (e) {
      console.warn('[google-login] sessionStorage failed', e);
    }

    const params = new URLSearchParams({ provider: 'google', mode });
    if (returnTo) params.set('returnTo', returnTo);

    router.replace(`/auth/google/callback?${params.toString()}`);
  };

  const handleGoogleLogin = async () => {
    debugFirebaseWebConfig('google-login');

    const { cfg, missingKeys } = getWebFirebaseConfigOrNull();
    if (!cfg) {
      const err = new Error(`Missing Firebase web config (${missingKeys.join(', ')})`);
      onFailure?.(err);
      alert(CONFIG_MISSING_MESSAGE);
      return;
    }

    try {
      setLoading(true);

      try {
        const result = await signInGooglePopup();
        if (!result?.user) throw new Error('Google popup did not return a user');

        const idToken = await result.user.getIdToken(true);
        await onSuccess(idToken);

        setLoading(false);
        return;
      } catch (e: any) {
        const code = e?.code || '';
        const message = e?.message || String(e);

        const popupBlocked =
          code === 'auth/popup-blocked' ||
          code === 'auth/cancelled-popup-request' ||
          code === 'auth/popup-closed-by-user';

        const unsupported =
          code === 'auth/operation-not-supported-in-this-environment' ||
          code === 'auth/operation-not-allowed';

        const likelyDomainIssue =
          code === 'auth/unauthorized-domain' ||
          /unauthorized domain/i.test(message) ||
          /authDomain/i.test(message);

        if (likelyDomainIssue) {
          console.warn('[google-login] likely unauthorized domain / authDomain issue', { code, message });
        }

        if (popupBlocked || unsupported) {
          startRedirectFlow();
          return;
        }

        throw e;
      }
    } catch (err: any) {
      console.error('[google-login] failure', err);

      try {
        sessionStorage.removeItem(REDIRECT_MARKER);
        sessionStorage.removeItem(BUSY_KEY);
        sessionStorage.removeItem(REDIRECT_STARTED);
      } catch {}

      setLoading(false);
      onFailure?.(err instanceof Error ? err : undefined);

      const msg = err instanceof Error ? err.message : '';
      alert(msg.includes('Missing Firebase web config') ? CONFIG_MISSING_MESSAGE : 'Failed to start Google sign-in.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className={
        className ??
        `inline-flex w-full items-center justify-center gap-3 rounded-xl
         border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900
         shadow-sm transition hover:bg-gray-50
         disabled:cursor-not-allowed disabled:opacity-60
         dark:border-white/20 dark:bg-black/20 dark:text-white dark:hover:bg-white/10`
      }
      aria-busy={loading}
    >
      <FcGoogle className="h-5 w-5 rounded-full bg-white p-[2px]" />
      {loading ? 'Signing in…' : 'Continue with Google'}
    </button>
  );
}