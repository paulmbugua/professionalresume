// apps/web/src/components/CustomGoogleLoginButton.tsx
import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { signInWithRedirect } from 'firebase/auth';
import { auth, provider } from '@mytutorapp/shared/utils/firebaseConfig';

export interface CustomGoogleLoginButtonProps {
  onSuccess: (idToken: string) => Promise<void>;
  onFailure: (error?: Error) => void;
}

const REDIRECT_MARKER = 'auth:googleRedirect';

const CustomGoogleLoginButton: React.FC<CustomGoogleLoginButtonProps> = ({
  onSuccess, // handled by handler after return
  onFailure, // handled by handler after return
}) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      console.log('[Google][Button] starting signInWithRedirect…');
      localStorage.setItem(REDIRECT_MARKER, '1');   // <— mark intent
      await signInWithRedirect(auth, provider);
      // navigation away happens now
    } catch (err: any) {
      console.error('❌ [Google][Button] redirect start failed:', err?.code, err?.message, err);
      localStorage.removeItem(REDIRECT_MARKER);
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
      {loading ? 'Redirecting…' : 'Continue with Google'}
    </button>
  );
};

export default CustomGoogleLoginButton;
