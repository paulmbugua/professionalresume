// packages/shared/hooks/useInstitutionAuth.ts
import { useShopContext } from '@mytutorapp/shared/context';
import {
  institutionLogin,
  institutionRegister,
  institutionGoogleLogin,
  institutionRequestReset,
  institutionVerifyReset,
} from '@mytutorapp/shared/api/institutionAuth';
import { bootstrapOrg } from '@mytutorapp/shared/api/orgApi';

type Options = {
  alertFn?: (msg: string) => void;
  navigateFn?: (dest?: string) => void;
};

export default function useInstitutionAuth(opts: Options = {}) {
  const { backendUrl, setToken: setCtxToken } = useShopContext() as any;
  const alertFn = opts.alertFn ?? ((m) => console.log('[inst-auth]', m));

  const readReturnTo = (): string => {
    if (typeof window === 'undefined') return '';
    return (
      sessionStorage.getItem('auth:returnTo') ||
      sessionStorage.getItem('auth:returnTo:org') ||
      ''
    );
  };

  const isInviteReturn = (target: string): boolean => {
    if (!target) return false;
    // any /org/join/:code or a direct robot-teach with assignment params
    return /\/org\/join\/[^/]+/.test(target) || /[?&]assignmentId=/.test(target);
  };

  const applyToken = async (t?: string) => {
    if (!t) return;
    try {
      // Save token to context
      setCtxToken?.(t);

      // Decide mode by where we're headed
      const returnTo = readReturnTo();
      const inviteFlow = isInviteReturn(returnTo);

      if (inviteFlow) {
        // Learner invite flow → do NOT bootstrap a new org, and mark learner mode
        localStorage.setItem('auth:mode', 'learner');
      } else {
        // Portal/owner/admin flow → keep current behavior
        localStorage.setItem('auth:mode', 'org');
        try {
          await bootstrapOrg(backendUrl, t);
        } catch (e) {
          console.warn('[inst-auth] bootstrapOrg failed (non-fatal)', (e as any)?.message);
        }
      }
    } finally {
      // Navigate (InstitutionLogin will read the saved returnTo)
      opts.navigateFn?.();
    }
  };

  return {
    // Email / password
    async loginWithEmail({ email, password }: { email: string; password: string }) {
      const res = await institutionLogin(backendUrl, email, password);
      if (!res.success || !res.token) throw new Error(res.message || 'Login failed');
      await applyToken(res.token);
      return res;
    },

    async registerWithEmail({ name, email, password }: { name: string; email: string; password: string }) {
      const res = await institutionRegister(backendUrl, name, email, password);
      if (!res.success || !res.token) throw new Error(res.message || 'Sign up failed');
      await applyToken(res.token);
      return res;
    },

    // Google
    async handleGoogleLoginSuccess(googleCredential: string, prefName?: string) {
      const res = await institutionGoogleLogin(backendUrl, googleCredential, prefName);
      if (!res.success || !res.token) throw new Error(res.message || 'Google sign-in failed');
      await applyToken(res.token);
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
