// packages/shared/hooks/useInstitutionAuth.ts
import { useShopContext } from '@mytutorapp/shared/context';
import {
  institutionLogin,
  institutionRegister,
  institutionGoogleLogin,
  institutionRequestReset,
  institutionVerifyReset,
} from '@mytutorapp/shared/api/institutionAuth';

type Options = {
  alertFn?: (msg: string) => void;
  navigateFn?: (dest?: string) => void;
};

export default function useInstitutionAuth(opts: Options = {}) {
  const { backendUrl, setToken: setCtxToken } = useShopContext() as any;
  const alertFn = opts.alertFn ?? ((m) => console.log('[inst-auth]', m));

  const applyToken = (t?: string) => {
    if (!t) return;
    try {
      setCtxToken?.(t);
    } catch {}
    try {
       localStorage.setItem('auth:mode', 'org'); // sticky institution context
      // If your app watches this key, this is enough; otherwise trigger a lightweight refresh:
      // window.location.reload();
    } catch {}
    opts.navigateFn?.();
  };

  return {
    // Email/pw
    async loginWithEmail({ email, password }: { email: string; password: string }) {
      const res = await institutionLogin(backendUrl, email, password);
      if (!res.success || !res.token) throw new Error(res.message || 'Login failed');
      applyToken(res.token);
      return res;
    },

    async registerWithEmail({ name, email, password }: { name: string; email: string; password: string }) {
      const res = await institutionRegister(backendUrl, name, email, password);
      if (!res.success || !res.token) throw new Error(res.message || 'Sign up failed');
      applyToken(res.token);
      return res;
    },

    // Google
    async handleGoogleLoginSuccess(googleCredential: string, prefName?: string) {
      const res = await institutionGoogleLogin(backendUrl, googleCredential, prefName);
      if (!res.success || !res.token) throw new Error(res.message || 'Google sign-in failed');
      applyToken(res.token);
      return res;
    },
    handleGoogleLoginFailure(err?: any) {
      alertFn(err?.message || 'Google sign-in failed');
    },

    // Reset
    async sendResetOTP(email: string) {
      const r = await institutionRequestReset(backendUrl, email);
      if (!r?.success) throw new Error(r?.message || 'Failed to send OTP');
      return r;
    },
    async resetPasswordWithOTP(email: string, otp: string, newPassword: string) {
      const r = await institutionVerifyReset(backendUrl, email, otp, newPassword);
      if (!r?.success) throw new Error(r?.message || 'Failed to reset password');
      return r;
    },
  };
}
