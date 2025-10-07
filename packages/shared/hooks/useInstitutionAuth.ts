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
  navigateFn?: (dest?: string) => void; // caller decides where to go; we’ll just call it post-success
};

const hasWindow = () => typeof window !== 'undefined';

// ── Safe web storage helpers (no-ops on native) ─────────────────────────────
const safeSetLocal = (k: string, v: string) => {
  if (hasWindow()) {
    try { window.localStorage.setItem(k, v); } catch {}
  }
};
const safeRemoveLocal = (k: string) => {
  if (hasWindow()) {
    try { window.localStorage.removeItem(k); } catch {}
  }
};
const safeGetSession = (k: string): string => {
  if (!hasWindow()) return '';
  try { return window.sessionStorage.getItem(k) || ''; } catch { return ''; }
};
const safeSetSession = (k: string, v: string) => {
  if (hasWindow()) {
    try { window.sessionStorage.setItem(k, v); } catch {}
  }
};

// Invite-return detection (keeps learner invite flows intact)
const isInviteReturn = (target: string): boolean => {
  if (!target) return false;
  return /\/org\/join\/[^/]+/.test(target) || /[?&]assignmentId=/.test(target);
};

export default function useInstitutionAuth(opts: Options = {}) {
  const { backendUrl, setOrgToken } = useShopContext() as any;
  const alertFn = opts.alertFn ?? ((m: string) => console.log('[inst-auth]', m));

  // Web-only; native screens manage returnTo with AsyncStorage
  const readReturnTo = (): string => {
    return (
      safeGetSession('auth:returnTo') ||
      safeGetSession('auth:returnTo:org') ||
      ''
    );
  };

  // Single place to persist the org token + set org mode + bootstrap when needed
  const applyOrgToken = async (t?: string) => {
    if (!t) return;

    // 1) Persist org token in shared context (provider handles storage)
    await setOrgToken?.(t);

    // 2) Web-only org mode + bootstrap decision based on returnTo
    const returnTo = readReturnTo();
    const inviteFlow = isInviteReturn(returnTo);

    if (inviteFlow) {
      // Learner invite through org → org UI mode; no bootstrap
      safeSetLocal('auth:mode', 'org');
      // Optional: steer a specific landing if desired
      safeSetSession('auth:returnTo', '/org/join/complete');
    } else {
      // Owner/admin/portal flow
      safeSetLocal('auth:mode', 'org');
      try {
        await bootstrapOrg(backendUrl, t);
      } catch (e: any) {
        console.warn('[inst-auth] bootstrapOrg non-fatal:', e?.message || e);
      }
    }

    // 3) Let caller navigate (native/web page decides where)
    opts.navigateFn?.();
  };

  return {
    // ── Email / password ────────────────────────────────────────────────────
    async loginWithEmail({ email, password }: { email: string; password: string }) {
      const res = await institutionLogin(backendUrl, email, password);
      if (!res?.success || !res?.token) throw new Error(res?.message || 'Login failed');
      await applyOrgToken(res.token);
      return res;
    },

    async registerWithEmail({ name, email, password }: { name: string; email: string; password: string }) {
      const res = await institutionRegister(backendUrl, name, email, password);
      if (!res?.success || !res?.token) throw new Error(res?.message || 'Sign up failed');
      await applyOrgToken(res.token);
      return res;
    },

    // ── Google ──────────────────────────────────────────────────────────────
    async handleGoogleLoginSuccess(googleCredential: string, prefName?: string) {
      const res = await institutionGoogleLogin(backendUrl, googleCredential, prefName);
      if (!res?.success || !res?.token) throw new Error(res?.message || 'Google sign-in failed');
      await applyOrgToken(res.token);
      return res;
    },
    handleGoogleLoginFailure(err?: any) {
      alertFn(err?.message || 'Google sign-in failed');
    },

    // ── Password reset (OTP) ────────────────────────────────────────────────
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
