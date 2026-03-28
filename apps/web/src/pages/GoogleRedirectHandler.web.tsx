'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getAuthSafe,
  getGoogleRedirectToken,
  signInGoogleRedirect,
  subscribeAuthToken,
} from '../utils/firebaseAuthWeb';

type LoginMode = 'consumer' | 'institution';

type Props = {
  onSuccess: (idToken: string) => Promise<void>;
  onFailure: (error?: Error) => void;
  defaultConsumerReturnTo?: string; // default: '/builder'
  defaultInstitutionReturnTo?: string; // default: '/org/profile'
};

const REDIRECT_MARKER = 'auth:googleRedirect';
const REDIRECT_STARTED = 'auth:googleRedirect:started';
const BUSY_KEY = 'auth:busy';

const CONFIG_MISSING_MESSAGE =
  'Auth is temporarily unavailable (missing web config). Please contact support@daybreaklearner.com.';

const DEFAULT_CONSUMER_RETURN_TO = '/builder';
const DEFAULT_INSTITUTION_RETURN_TO = '/org/profile';

const sanitizeInternalPath = (raw?: string | null, fallback = '/') => {
  const s = (raw || '').trim();
  if (!s) return fallback;

  // block scheme/protocol-relative
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return fallback;
  if (s.startsWith('//')) return fallback;

  // require internal path
  if (!s.startsWith('/')) return fallback;

  return s.replace(/\/{2,}/g, '/');
};

export default function GoogleRedirectHandler({
  onSuccess,
  onFailure,
  defaultConsumerReturnTo = DEFAULT_CONSUMER_RETURN_TO,
  defaultInstitutionReturnTo = DEFAULT_INSTITUTION_RETURN_TO,
}: Props) {
  const doneRef = useRef(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeSearchParams = searchParams ?? new URLSearchParams();

  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const mode = (safeSearchParams.get('mode') === 'institution'
    ? 'institution'
    : 'consumer') as LoginMode;

  const rawReturnTo = useMemo(() => safeSearchParams.get('returnTo') || '', [safeSearchParams]);
  const fallbackReturnTo = mode === 'institution' ? defaultInstitutionReturnTo : defaultConsumerReturnTo;
  const returnTo = useMemo(() => sanitizeInternalPath(rawReturnTo, fallbackReturnTo), [rawReturnTo, fallbackReturnTo]);

  const loginRoute = mode === 'institution' ? '/institutions/login' : '/login';

  useEffect(() => {
    if (!mounted) return;

    let alive = true;

    const clearBusy = () => {
      try {
        sessionStorage.removeItem(REDIRECT_MARKER);
        sessionStorage.removeItem(BUSY_KEY);
        sessionStorage.removeItem(REDIRECT_STARTED);
      } catch {}
    };

    const complete = async (idToken: string) => {
      if (!alive || doneRef.current) return;
      doneRef.current = true;

      try {
        await onSuccess(idToken);
        router.replace(returnTo);
      } finally {
        clearBusy();
      }
    };

    const run = async () => {
      let hadMarker = false;
      try {
        hadMarker = sessionStorage.getItem(REDIRECT_MARKER) === '1';
      } catch {}

      if (!hadMarker) {
        setError('No Google sign-in was in progress.');
        return;
      }

      try {
        if (sessionStorage.getItem(REDIRECT_STARTED) !== '1') {
          sessionStorage.setItem(REDIRECT_STARTED, '1');
          await signInGoogleRedirect();
          return;
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to start Google redirect sign-in.');
        onFailure(e instanceof Error ? e : undefined);
        clearBusy();
        return;
      }

      const auth = await getAuthSafe();
      if (!auth) {
        const err = new Error('Missing Firebase web config');
        onFailure(err);
        setError(CONFIG_MISSING_MESSAGE);
        clearBusy();
        return;
      }

      // 1) try immediate redirect result token
      try {
        const redirectToken = await getGoogleRedirectToken(auth);
        if (redirectToken) {
          await complete(redirectToken);
          return;
        }
      } catch (e: any) {
        setError(e?.message || 'Google sign-in failed.');
        onFailure(e instanceof Error ? e : undefined);
        clearBusy();
        return;
      }

      // 2) otherwise subscribe to token changes briefly
      const unsub = await subscribeAuthToken(auth, async (idToken) => {
        if (!alive || doneRef.current) return;
        try {
          await complete(idToken);
        } catch (e: any) {
          setError(e?.message || 'Google sign-in failed.');
          onFailure(e instanceof Error ? e : undefined);
          clearBusy();
        }
      });

      const timeoutId = window.setTimeout(() => {
        if (!alive || doneRef.current) return;
        setError('Google sign-in did not complete. Please try again.');
        onFailure(new Error('Google redirect did not complete in time'));
        clearBusy();
      }, 15000);

      return () => {
        window.clearTimeout(timeoutId);
        unsub();
      };
    };

    let cleanup: (() => void) | undefined;

    void run().then((cb) => {
      cleanup = cb;
    });

    return () => {
      alive = false;
      cleanup?.();
    };
  }, [mounted, mode, onFailure, onSuccess, router, returnTo]);

  if (!mounted) return null;

  if (!error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white/80 p-4 text-sm text-gray-700 dark:border-white/20 dark:bg-black/20 dark:text-white/70">
        Completing Google sign-in…
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
      <p>{error}</p>
      <button
        type="button"
        onClick={() => router.replace(loginRoute)}
        className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
