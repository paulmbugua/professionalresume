// apps/web/src/pages/AuthCallbackPage.web.tsx
import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { auth, provider } from '@mytutorapp/shared/utils/firebaseConfig';
import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  getIdToken,
} from 'firebase/auth';

const REDIRECT_MARKER = 'auth:googleRedirect';
const RETURN_TO = 'auth:returnTo';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    (async () => {
      const params = new URLSearchParams(location.search);
      const start = params.get('start') === '1';

      // START only once
      if (start) {
        if (sessionStorage.getItem(REDIRECT_MARKER) === '1') return;

        sessionStorage.setItem(REDIRECT_MARKER, '1');

        // Remove ?start=1 so we don't re-trigger on return
        const clean = new URL(window.location.href);
        clean.searchParams.delete('start');
        window.history.replaceState({}, '', clean.toString());

        await signInWithRedirect(auth, provider);
        return; // navigates to Google
      }

      // Returned from Google → finish
      try {
        const result = await getRedirectResult(auth);
        let idToken: string | undefined;

        if (result) {
          const cred = GoogleAuthProvider.credentialFromResult(result);
          idToken = cred?.idToken;
        }

        if (!idToken && auth.currentUser) {
          idToken = await getIdToken(auth.currentUser, true); // Firebase ID token
        }

        if (!idToken) {
          sessionStorage.removeItem(REDIRECT_MARKER);
          navigate('/login', { replace: true });
          return;
        }

        await fetch('/api/user/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: idToken }),
        });

        const returnTo = sessionStorage.getItem(RETURN_TO) || '/profile';
        sessionStorage.removeItem(RETURN_TO);
        sessionStorage.removeItem(REDIRECT_MARKER);

        if (!mounted) return;
        navigate(returnTo, { replace: true });
      } catch (e) {
        console.error('[AuthCallback] finish failed:', e);
        sessionStorage.removeItem(REDIRECT_MARKER);
        navigate('/login', { replace: true });
      }
    })();

    // Safety: hydrates a tick later
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!mounted || !u) return;
      if (sessionStorage.getItem(REDIRECT_MARKER) !== '1') return;

      try {
        const tok = await getIdToken(u, true);
        await fetch('/api/user/google-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tok }),
        });
      } finally {
        const returnTo = sessionStorage.getItem(RETURN_TO) || '/profile';
        sessionStorage.removeItem(RETURN_TO);
        sessionStorage.removeItem(REDIRECT_MARKER);
        if (!mounted) return;
        navigate(returnTo, { replace: true });
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="rounded-xl px-4 py-3 shadow ring-1 bg-white dark:bg-[#0f1821]">
        <span className="text-sm">Signing you in…</span>
      </div>
    </div>
  );
}
