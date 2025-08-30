// apps/web/src/components/GoogleRedirectHandler.tsx
import React, { useEffect, useRef } from 'react';
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
const BUSY_KEY = 'auth:busy';

const GoogleRedirectHandler: React.FC<Props> = ({ onSuccess, onFailure }) => {
  const doneRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const hadMarker = sessionStorage.getItem(REDIRECT_MARKER) === '1';

    const clearBusy = () => {
      sessionStorage.removeItem(REDIRECT_MARKER);
      sessionStorage.removeItem(BUSY_KEY); // 🔹 hide overlay when finished
    };

    const complete = async (idToken: string) => {
      if (doneRef.current || !mounted) return;
      doneRef.current = true;
      try {
        await onSuccess(idToken);
      } finally {
        clearBusy();
      }
    };

    (async () => {
      try {
        if (!hadMarker) return;
        const result = await getRedirectResult(auth);
        if (!mounted) return;
        if (result) {
          const cred = GoogleAuthProvider.credentialFromResult(result);
          const idToken = cred?.idToken;
          if (!idToken) throw new Error('No Google ID token from redirect');
          await complete(idToken);
        }
      } catch (e) {
        onFailure(e instanceof Error ? e : undefined);
        clearBusy();
      }
    })();

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!mounted || !u || !hadMarker || doneRef.current) return;
      try {
        const tok = await getIdToken(u, true);
        await complete(tok);
      } catch (e) {
        onFailure(e instanceof Error ? e : undefined);
        clearBusy();
      }
    });

    return () => { mounted = false; unsub(); };
  }, [onSuccess, onFailure]);

  return null;
};

export default GoogleRedirectHandler;