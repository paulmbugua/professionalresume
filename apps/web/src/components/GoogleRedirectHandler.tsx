// apps/web/src/components/GoogleRedirectHandler.tsx
import React, { useEffect } from 'react';
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
  useEffect(() => {
    let mounted = true;
    const hadMarker = localStorage.getItem(REDIRECT_MARKER) === '1';

    (async () => {
      try {
        const result = await getRedirectResult(auth);
        if (mounted && result) {
          const cred = GoogleAuthProvider.credentialFromResult(result);
          const idToken = cred?.idToken;
          if (!idToken) throw new Error('No Google ID token from redirect');
          localStorage.removeItem(REDIRECT_MARKER);
          await onSuccess(idToken);
        }
      } catch (e) {
        onFailure(e instanceof Error ? e : undefined);
      }
    })();

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!mounted || !u || !hadMarker) return;
      try {
        const tok = await getIdToken(u, true); // Firebase ID token
        localStorage.removeItem(REDIRECT_MARKER);
        await onSuccess(tok);
      } catch (e) {
        onFailure(e instanceof Error ? e : undefined);
      }
    });

    return () => { mounted = false; unsub(); };
  }, [onSuccess, onFailure]);

  return null; // absolutely no UI
};

export default GoogleRedirectHandler;
