import useAuth from '@mytutorapp/shared/hooks/useAuth';
import GoogleRedirectHandler from '../components/GoogleRedirectHandler';

// No early navigate-on-marker. Let the handler do the work.
export default function GlobalAuthRedirect() {
  const { handleGoogleLoginSuccess, handleGoogleLoginFailure } = useAuth({
    alertFn: (m) => console.log('[auth]', m),
    // navigateFn comes from your hook; it already sends the user to /profile
  });

  return (
    <GoogleRedirectHandler
      onSuccess={handleGoogleLoginSuccess}
      onFailure={handleGoogleLoginFailure}
    />
  );
}
