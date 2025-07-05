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

      // extract the Google ID Token
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const idToken = credential?.idToken;
      if (!idToken) {
        throw new Error('No Google ID token received');
      }

      await onSuccess(idToken);
    } catch (err: any) {
      console.error('❌ Google login failed:', err);
      let message = 'Failed to sign in with Google';
      if (err.code === 'auth/popup-closed-by-user')       message = 'Sign in cancelled';
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
      onClick={handleGoogleLogin}
      disabled={loading}
      className={`
        block mx-auto
        flex items-center justify-center
        space-x-3
        px-5 py-3
        rounded-md shadow
        transition duration-150
        ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-600'}
        bg-pink-500 text-white
      `}
    >
      <div className="bg-white rounded-full p-1">
        <FcGoogle className="w-6 h-6" />
      </div>
      <span className="font-medium">
        {loading ? 'Signing in...' : 'Continue with Google'}
      </span>
    </button>
  );
};

export default CustomGoogleLoginButton;
