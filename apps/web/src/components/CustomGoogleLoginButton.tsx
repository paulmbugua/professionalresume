import { auth, provider, signInWithPopup } from '@mytutorapp/shared/utils/firebaseConfig';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '@mytutorapp/shared/hooks';
import React from 'react';

const CustomGoogleLoginButton: React.FC = () => {
  const { handleGoogleLoginSuccess, handleGoogleLoginFailure } = useAuth({
    alertFn: (msg) => alert(msg),
    navigateFn: (to) => (window.location.href = to),
  });

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const token = await user.getIdToken();

      console.log('✅ Google user:', user);
      console.log('🔑 Firebase token:', token);

      // Pass the raw token string to your backend/session handler
      await handleGoogleLoginSuccess(token);
    } catch (error) {
      console.error('❌ Google login failed:', error);
      handleGoogleLoginFailure();
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="
        block mx-auto
        flex items-center justify-center
        space-x-3
        px-5 py-3
        rounded-md shadow
        transition duration-150
        btn
        hover:bg-pink-600
        text-white
      "
    >
      <div className="bg-white rounded-full p-1">
        <FcGoogle className="w-6 h-6" />
      </div>
      <span className="font-medium">Continue with Google</span>
    </button>
  );
};

export default CustomGoogleLoginButton;
