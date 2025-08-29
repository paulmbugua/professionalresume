// apps/web/src/components/GoogleRedirectHandler.tsx
import React, { useEffect, useState } from 'react';
import { auth } from '@mytutorapp/shared/utils/firebaseConfig';
import {
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  getIdToken,
} from 'firebase/auth';

type Props = {
  onSuccess: (idToken: string) => Promise<void>;
  onFailure: (error?: Error) => void;
};

const REDIRECT_MARKER = 'auth:googleRedirect';

const GoogleRedirectHandler: React.FC<Props> = ({ onSuccess, onFailure }) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('Finishing Google sign-in…');

  useEffect(() => {
    let mounted = true;

    const show = (msg?: string) => {
      if (!mounted) return;
      setMessage(msg || 'Finishing Google sign-in…');
      setVisible(true);
    };
    const hide = () => {
      if (!mounted) return;
      setVisible(false);
    };

    // If we *intended* to redirect, show the overlay immediately on return.
    const hadMarker = localStorage.getItem(REDIRECT_MARKER) === '1';
    if (hadMarker) show();

    // 1) Try the official redirect result first
    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (!mounted || !result) return;

        show();
        const cred = GoogleAuthProvider.credentialFromResult(result);
        const idToken = cred?.idToken;
        if (!idToken) throw new Error('No Google ID token from redirect');

        localStorage.removeItem(REDIRECT_MARKER);
        await onSuccess(idToken);
        // We keep the overlay visible; route change will unmount this component.
      } catch (err) {
        // Don’t hide yet; fallback below may still complete.
        if (err instanceof Error) console.error('[Google][Handler] redirect error:', err.message);
        onFailure(err instanceof Error ? err : undefined);
      }
    })();

    // 2) Fallback: if result was null but Firebase signed us in, finish with Firebase ID token
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!mounted || !u) return;
      if (!hadMarker) return; // normal page load; don’t show overlay

      try {
        show();
        const tok = await getIdToken(u, true);
        localStorage.removeItem(REDIRECT_MARKER);
        await onSuccess(tok);
      } catch (e) {
        console.error('[Google][Handler] fallback error:', e);
        setMessage('Could not finish sign-in. Please try again.');
        onFailure(e instanceof Error ? e : undefined);
        // give the user a moment to read the message; you can also offer a retry button here
        setTimeout(hide, 2000);
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, [onSuccess, onFailure]);

  if (!visible) return null;

  // Full-screen, theme-aware cover to hide the login UI while finishing
  return (
    <div
      className="
        fixed inset-0 z-[70] flex items-center justify-center
        bg-white/70 dark:bg-[#0f1821]/70 backdrop-blur-sm
      "
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="
          pointer-events-auto rounded-2xl px-5 py-4 shadow-lg ring-1
          bg-white text-darkText ring-gray-200
          dark:bg-[#0f1821] dark:text-darkTextPrimary dark:ring-darkCard
        "
      >
        <div className="flex items-center gap-3">
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-sm font-medium">{message}</span>
        </div>
      </div>
    </div>
  );
};

export default GoogleRedirectHandler;
