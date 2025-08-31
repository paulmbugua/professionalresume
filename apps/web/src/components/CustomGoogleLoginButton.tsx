// apps/web/src/components/CustomGoogleLoginButton.tsx
import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { auth, provider } from '@mytutorapp/shared/utils/firebaseConfig';

const REDIRECT_MARKER = 'auth:googleRedirect';
const BUSY_KEY = 'auth:busy';

export default function CustomGoogleLoginButton({
  onSuccess,
  onFailure,
}: {
  onSuccess: (idToken: string) => Promise<void>;
  onFailure: (error?: Error) => void;
}) {
  const [loading, setLoading] = useState(false);

  const startRedirectFlow = async () => {
    sessionStorage.setItem(REDIRECT_MARKER, '1');
    sessionStorage.setItem(BUSY_KEY, '1');
    await signInWithRedirect(auth, provider);
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);

      // 1) Try fast popup first
      try {
        const result = await signInWithPopup(auth, provider);
        const idToken = await result.user.getIdToken(/* forceRefresh */ true);
        await onSuccess(idToken);
        setLoading(false);
        return;
      } catch (e: any) {
        const code = e?.code || '';
        const popupBlocked =
          code === 'auth/popup-blocked' ||
          code === 'auth/cancelled-popup-request' ||
          code === 'auth/popup-closed-by-user';
        const unsupported =
          code === 'auth/operation-not-supported-in-this-environment' ||
          code === 'auth/operation-not-allowed';

        // 2) Fallback to redirect if popup won't work
        if (popupBlocked || unsupported) {
          await startRedirectFlow();
          return;
        }
        throw e; // real error -> drop to catch
      }
    } catch (err) {
      console.error('[google] signIn failed:', err);
      sessionStorage.removeItem(REDIRECT_MARKER);
      sessionStorage.removeItem(BUSY_KEY);
      setLoading(false);
      onFailure?.(err instanceof Error ? err : undefined);
      alert('Failed to start Google sign-in.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className={`inline-flex items-center justify-center gap-3 rounded-xl h-11 px-5
                  bg-primary text-white font-semibold shadow-sm hover:shadow transition
                  active:translate-y-[1px] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <FcGoogle className="w-5 h-5 bg-white rounded-full p-[2px]" />
      {loading ? 'Signing in…' : 'Continue with Google'}
    </button>
  );
}
