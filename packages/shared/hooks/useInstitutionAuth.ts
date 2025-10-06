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
  navigateFn?: (dest?: string) => void; // caller navigates; we compute final dest here
};

const hasWindow = () => typeof window !== 'undefined';
const tick = () => new Promise<void>((r) => setTimeout(r, 0)); // let context commit before guards run

// ── Safe web storage helpers (no-ops on native) ─────────────────────────────
const safeSetLocal = (k: string, v: string) => {
  if (hasWindow()) { try { window.localStorage.setItem(k, v); } catch {} }
};
const safeGetSession = (k: string): string => {
  if (!hasWindow()) return '';
  try { return window.sessionStorage.getItem(k) || ''; } catch { return ''; }
};
const safeSetSession = (k: string, v: string) => {
  if (hasWindow()) { try { window.sessionStorage.setItem(k, v); } catch {} }
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
  const readReturnTo = (): string =>
    safeGetSession('auth:returnTo') || safeGetSession('auth:returnTo:org') || '';

  // ── Single place to persist token, set mode, bootstrap, and navigate ──
  const applyOrgToken = async (t?: string) => {
    if (!t) return;

    // 1) Persist token in context (provider may also persist to storage)
    await setOrgToken?.(t);

    // 2) Give React a micro-tick so route guards see the updated token
    await tick();

    // 3) Mark org mode (used by app shell/guards)
    safeSetLocal('auth:mode', 'org');

    // 4) Read & normalize returnTo (allow only same-origin paths)
    const rawReturnTo = readReturnTo();
    const normalizeReturnTo = (v?: string) => {
      if (!v) return '';
      try {
        if (/^https?:\/\//i.test(v) || /^\/\//.test(v)) return ''; // block external
        return v.startsWith('/') ? v : `/${v.replace(/^\/+/, '')}`;
      } catch { return ''; }
    };
    const safeReturnTo = normalizeReturnTo(rawReturnTo);
    const inviteFlow = isInviteReturn(safeReturnTo);

    // 5) Bootstrap org only for portal/owner flows (not invite flows)
    if (!inviteFlow) {
      try { await bootstrapOrg(backendUrl, t); }
      catch (e: any) { console.warn('[inst-auth] bootstrapOrg non-fatal:', e?.message || e); }
    }

    // 6) Final destination
    const target = inviteFlow ? (safeReturnTo || '/org/join/complete') : '/org/profile';

    // 7) Clear stored intents (new + legacy)
    safeSetSession('auth:returnTo', '');
    safeSetSession('auth:returnTo:org', '');

    // 8) Navigate once (page trusts this dest)
    opts.navigateFn?.(target);
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
