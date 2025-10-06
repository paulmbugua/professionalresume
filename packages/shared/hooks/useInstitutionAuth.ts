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
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Robust feature-detect: some browsers/extensions throw on mere access. */
let _canLocal: boolean | null = null;
let _canSession: boolean | null = null;
function canUseLocal(): boolean {
  if (!hasWindow()) return false;
  if (_canLocal !== null) return _canLocal;
  try {
    const k = '__t_local';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    _canLocal = true;
  } catch {
    _canLocal = false;
  }
  return _canLocal;
}
function canUseSession(): boolean {
  if (!hasWindow()) return false;
  if (_canSession !== null) return _canSession;
  try {
    const k = '__t_session';
    window.sessionStorage.setItem(k, '1');
    window.sessionStorage.removeItem(k);
    _canSession = true;
  } catch {
    _canSession = false;
  }
  return _canSession;
}

// ── Safe web storage helpers (no-ops if blocked) ────────────────────────────
const safeSetLocal = (k: string, v: string) => {
  if (canUseLocal()) { try { window.localStorage.setItem(k, v); } catch {} }
};
const safeGetSession = (k: string): string => {
  if (!canUseSession()) return '';
  try { return window.sessionStorage.getItem(k) || ''; } catch { return ''; }
};
const safeSetSession = (k: string, v: string) => {
  if (canUseSession()) { try { window.sessionStorage.setItem(k, v); } catch {} }
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

    // 1) Persist token in context
    await setOrgToken?.(t);

    // 2) Let React commit so guards can see token
    await tick();

    // 3) Mark org mode (only if localStorage is allowed)
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

    // 5) Bootstrap org only for portal/owner flows
    if (!inviteFlow) {
      try { await bootstrapOrg(backendUrl, t); }
      catch (e: any) { console.warn('[inst-auth] bootstrapOrg non-fatal:', e?.message || e); }
    }

    // 6) Final destination
    const target = inviteFlow ? (safeReturnTo || '/org/join/complete') : '/org/profile';

    // 7) Clear stored intents (new + legacy) if sessionStorage works
    safeSetSession('auth:returnTo', '');
    safeSetSession('auth:returnTo:org', '');

    // 8) Navigate once
    opts.navigateFn?.(target);
  };

  return {
    // Email / password
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

    // Google
    async handleGoogleLoginSuccess(googleCredential: string, prefName?: string) {
      const res = await institutionGoogleLogin(backendUrl, googleCredential, prefName);
      if (!res?.success || !res?.token) throw new Error(res?.message || 'Google sign-in failed');
      await applyOrgToken(res.token);
      return res;
    },
    handleGoogleLoginFailure(err?: any) {
      alertFn(err?.message || 'Google sign-in failed');
    },

    // Password reset (OTP)
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
