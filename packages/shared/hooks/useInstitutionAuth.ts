import { useShopContext } from '@mytutorapp/shared/context';
import {
  institutionLogin,
  institutionRegister,
  institutionGoogleLogin,
  institutionRequestReset,
  institutionVerifyReset,
} from '@mytutorapp/shared/api/institutionAuth';
import { bootstrapOrg, getMyOrgOrBootstrap } from '@mytutorapp/shared/api/orgApi';

type Options = {
  alertFn?: (msg: string) => void;
  navigateFn?: (dest?: string) => void; // kept for native/compat, but we’ll hard-reload on web
};

const hasWindow = () => typeof window !== 'undefined';
const MUST_CHANGE_KEY = 'org:mustChangePassword';


// ── Safe storage helpers ────────────────────────────────────────────────────
const safeSetLocal = (k: string, v: string) => { if (hasWindow()) { try { localStorage.setItem(k, v); } catch {} } };
const safeRemoveLocal = (k: string) => { if (hasWindow()) { try { localStorage.removeItem(k); } catch {} } };
const safeGetSession = (k: string): string => { if (!hasWindow()) return ''; try { return sessionStorage.getItem(k) || ''; } catch { return ''; } };
const safeSetSession = (k: string, v: string) => { if (hasWindow()) { try { sessionStorage.setItem(k, v); } catch {} } };
const safeRemoveSession = (k: string) => { if (hasWindow()) { try { sessionStorage.removeItem(k); } catch {} } };

// Invite-return detection
const isInviteReturn = (target: string): boolean =>
  !!target && (/\/org\/join\/[^/]+/.test(target) || /[?&]assignmentId=/.test(target));

// Prefer hard reload so providers (e.g., useOrg) re-read storage
const hardNavigate = (target: string) => {
  if (!hasWindow()) return;
  // clear consumed returnTo before leaving
  safeRemoveSession('auth:returnTo');
  safeRemoveSession('auth:returnTo:org');
  window.location.assign(target);
};

export default function useInstitutionAuth(opts: Options = {}) {
  const { backendUrl, setOrgToken } = useShopContext() as any;
  const alertFn = opts.alertFn ?? ((m: string) => console.log('[inst-auth]', m));

  const readReturnTo = (): string =>
    safeGetSession('auth:returnTo') ||
    safeGetSession('auth:returnTo:org') ||
    '/org/profile';

  // Persist token + org mode + orgId, then reload into the org shell
// Persist token + org mode + orgId/role, then reload into the org shell
const applyOrgToken = async (t?: string, meta?: { mustChangePassword?: boolean }) => {
  if (!t) return;

  // 0) Clear stale keys first
  safeRemoveLocal('org:activeId');
  safeRemoveLocal('org:role');
  safeRemoveLocal('auth:orgId');

  // 🔐 NEW: remember if this session must change password
  if (meta?.mustChangePassword) {
    safeSetSession(MUST_CHANGE_KEY, '1');
  } else {
    safeRemoveSession(MUST_CHANGE_KEY);
  }

  // 1) Put org JWT into context (provider also persists as needed)
  await setOrgToken?.(t);

  // 2) Flip into org UI mode
  safeSetLocal('auth:mode', 'org');

  // 3) Ensure org exists AND fetch my_role (always call the reader)
  try {
    try {
      await bootstrapOrg(backendUrl, t);
    } catch (e: any) {
      console.warn('[inst-auth] bootstrapOrg non-fatal:', e?.message || e);
    }

    const org = await getMyOrgOrBootstrap(backendUrl, t);

    if (org?.id) {
      safeSetLocal('org:activeId', org.id);
      safeSetLocal('auth:orgId', org.id);
    }
    if (org?.my_role) {
      safeSetLocal('org:role', String(org.my_role).toLowerCase());
    }
  } catch (e: any) {
    console.warn('[inst-auth] getMyOrgOrBootstrap failed:', e?.message || e);
  }

  // 4) Choose where to send them
  const baseTarget = readReturnTo() || '/org/profile';

  // ✅ If they *must* change password, always land on the change page first
  const target = meta?.mustChangePassword ? '/org/change-password' : baseTarget;

  try {
    opts.navigateFn?.(target);
  } finally {
    hardNavigate(target);
  }
};



  return {
  async loginWithEmail({ email, password }: { email: string; password: string }) {
    const res = await institutionLogin(backendUrl, email, password);
    if (!res?.success || !res?.token) throw new Error(res?.message || 'Login failed');

    // 🔐 PASS the flag through
    await applyOrgToken(res.token, { mustChangePassword: !!res.mustChangePassword });

    return res;
  },

  async registerWithEmail({ name, email, password }: { name: string; email: string; password: string }) {
    const res = await institutionRegister(backendUrl, name, email, password);
    if (!res?.success || !res?.token) throw new Error(res?.message || 'Sign up failed');

    // For owners/admins, we normally don't force a change, but still support the flag
    await applyOrgToken(res.token, { mustChangePassword: !!res.mustChangePassword });

    return res;
  },

  async handleGoogleLoginSuccess(googleCredential: string, prefName?: string) {
    const res = await institutionGoogleLogin(backendUrl, googleCredential, prefName);
    if (!res?.success || !res?.token) throw new Error(res?.message || 'Google sign-in failed');

    await applyOrgToken(res.token, { mustChangePassword: !!res.mustChangePassword });

    return res;
  },
    handleGoogleLoginFailure(err?: any) {
      alertFn(err?.message || 'Google sign-in failed');
    },

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
