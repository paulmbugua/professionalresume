// apps/web/src/components/CustomGoogleLoginButton.tsx
import React, { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, provider } from '@mytutorapp/shared/utils/firebaseConfig';

export interface CustomGoogleLoginButtonProps {
  onSuccess: (idToken: string) => Promise<void>;
  onFailure: (error?: Error) => void;
}

const CustomGoogleLoginButton: React.FC<CustomGoogleLoginButtonProps> = ({
  onSuccess,
  onFailure,
}) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);

      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken = credential?.idToken;
      if (!idToken) throw new Error('No Google ID token received');

      await onSuccess(idToken);
    } catch (err: any) {
      console.error('❌ Google login failed:', err);
      let message = 'Failed to sign in with Google';
      if (err.code === 'auth/popup-closed-by-user') message = 'Sign in cancelled';
      else if (err.code === 'auth/cancelled-popup-request') message = 'Sign in already in progress';
      else if (err.code === 'auth/operation-not-supported-in-this-environment')
        message = 'Operation not supported in this browser';
      else if (err.message.includes('No Google ID token')) message = 'Authentication failed – no token';

      alert(message);
      onFailure(err instanceof Error ? err : undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className={`
        inline-flex items-center justify-center gap-3
        rounded-xl h-11 px-5
        bg-primary text-white font-semibold
        shadow-sm hover:shadow
        transition active:translate-y-[1px]
        ${loading ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <FcGoogle className="w-5 h-5 bg-white rounded-full p-[2px]" />
      {loading ? 'Signing in...' : 'Continue with Google'}
    </button>
  );
};

export default CustomGoogleLoginButton;
