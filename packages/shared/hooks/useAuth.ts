// packages/shared/hooks/useAuth.ts
import { useCallback, useState } from 'react';
import { useShopContext } from '@cvpro/shared/context';
import * as api from '@cvpro/shared/api';

import type { AuthPayload, RegisterPayload, AuthResponse } from '@cvpro/shared/types';

export interface UseLoginOptions {
  alertFn?: (message: string) => void;
  navigateFn?: (destination?: string) => void; // web: path, native: screen name (after alias)
}

/* ------------------------------- Env & routes ------------------------------- */
// Detect React Native vs Web; RN needs screen names, Web uses paths.
const isNative = typeof navigator !== 'undefined' && (navigator as any)?.product === 'ReactNative';

// Map web-style paths to native screen names (CVPro minimal).
function routeAlias(input?: string): string | undefined {
  if (!input) return input;
  if (!isNative) return input; // keep raw paths on web

  switch (input.toLowerCase()) {
    case '/':
    case '/landing':
    case 'landing':
      return 'Landing';
    case '/login':
    case 'login':
      return 'Login';
    case '/builder':
    case 'builder':
      return 'Builder';
    case '/templates':
    case 'templates':
      return 'Templates';
    case '/account':
    case '/me':
    case '/profile/me':
      return 'Account';
    default:
      // CVPro: safest default is Builder
      return 'Builder';
  }
}

/* ------------------------- Safe, cross-platform storage ------------------------- */

const memStore = new Map<string, string>();

function storageGet(key: string): string | null {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      'localStorage' in globalThis &&
      (globalThis as any).localStorage
    ) {
      return (globalThis as any).localStorage.getItem(key);
    }
  } catch {}
  return memStore.get(key) ?? null;
}

function storageSet(key: string, value: string | null): void {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      'localStorage' in globalThis &&
      (globalThis as any).localStorage
    ) {
      if (value === null) (globalThis as any).localStorage.removeItem(key);
      else (globalThis as any).localStorage.setItem(key, value);
      return;
    }
  } catch {}
  if (value === null) memStore.delete(key);
  else memStore.set(key, value);
}

/* --------------------------- Generic return-to helpers --------------------------- */

const RETURN_TO_KEY = 'auth:returnTo';

/** Turn absolute URL → path, drop hash, keep query. */
function normalizeToPath(input?: string | null): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      return `${u.pathname}${u.search || ''}`;
    }
  } catch {
    /* fall through */
  }
  return s;
}

function readReturnTo(): string | null {
  // sessionStorage first (LoginPage stores it there)
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(RETURN_TO_KEY);
      if (raw) return normalizeToPath(raw);
    }
  } catch {}
  return normalizeToPath(storageGet(RETURN_TO_KEY));
}

function clearReturnTo() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(RETURN_TO_KEY);
    }
  } catch {}
  storageSet(RETURN_TO_KEY, null);
}

/** Next destination after successful auth, honoring any generic returnTo */
function nextAfterAuth(defaultPath: string): string {
  const saved = readReturnTo();
  clearReturnTo();
  return saved || defaultPath;
}

/* --------------------------------- Hook ---------------------------------- */

const DEFAULT_AFTER_AUTH = '/builder';

const useAuth = (options?: UseLoginOptions) => {
  const { alertFn, navigateFn } = options || {};
  const nav = (to?: string) => {
    if (navigateFn) navigateFn(routeAlias(to));
  };

  // Read context once, then safely pluck optional fields
  const shop = useShopContext() as unknown as {
    setToken: (t: string) => void;
    backendUrl: string;
    token?: string;
    setProfile?: (p: unknown | null) => void;
  };

  const { setToken, backendUrl, token } = shop;
  const setProfile = shop.setProfile; // optional

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);

  /** GOOGLE OAUTH CALLBACK FLOW (CVPro) */
  const handleGoogleOAuthCode = useCallback(
    async (code: string) => {
      try {
        const resp: AuthResponse = await api.exchangeGoogleAuthCode(backendUrl, code);
        const jwt = resp?.token;

        if (!jwt) throw new Error('No JWT returned from google oauth exchange');

        setToken(jwt);

        // optional profile support (if backend ever returns it)
        const maybeProfile = (resp as unknown as { profile?: unknown }).profile;
        if (typeof maybeProfile !== 'undefined') {
          setProfile?.(maybeProfile ?? null);
        }

        nav(nextAfterAuth(DEFAULT_AFTER_AUTH));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Google authentication failed';
        alertFn?.(msg);
        throw e;
      }
    },
    [backendUrl, setToken, setProfile, alertFn]
  );

  const handleGoogleLoginFailure = useCallback(
    (error?: Error) => {
      alertFn?.(error?.message || 'Google sign-in failed');
    },
    [alertFn]
  );

  /** EMAIL/PASSWORD FLOWS (CVPro) */
  const loginWithEmail = useCallback(
    async (payload: AuthPayload): Promise<AuthResponse> => {
      const resp = await api.login(backendUrl, payload);

      if (resp?.token) {
        setToken(resp.token);

        const maybeProfile = (resp as unknown as { profile?: unknown }).profile;
        if (typeof maybeProfile !== 'undefined') {
          setProfile?.(maybeProfile ?? null);
        }

        nav(nextAfterAuth(DEFAULT_AFTER_AUTH));
      }

      return resp;
    },
    [backendUrl, setToken, setProfile]
  );

  const registerWithEmail = useCallback(
    async (payload: RegisterPayload): Promise<AuthResponse> => {
      const resp = await api.register(backendUrl, payload);

      if (resp?.token) {
        setToken(resp.token);

        const maybeProfile = (resp as unknown as { profile?: unknown }).profile;
        if (typeof maybeProfile !== 'undefined') {
          setProfile?.(maybeProfile ?? null);
        }

        nav(nextAfterAuth(DEFAULT_AFTER_AUTH));
      }

      return resp;
    },
    [backendUrl, setToken, setProfile]
  );

  /** OTP reset flow (CVPro) */
  const sendResetOTP = useCallback(
    async (email: string): Promise<AuthResponse> => {
      return api.requestOTP(backendUrl, email);
    },
    [backendUrl]
  );

  const resetPasswordWithOTP = useCallback(
    async (email: string, otp: string, newPassword: string): Promise<AuthResponse> => {
      return api.verifyOTP(backendUrl, email, otp, newPassword);
    },
    [backendUrl]
  );

  /** Logout */
  const logout = useCallback(() => {
    setToken('');
    setProfile?.(null);
    clearReturnTo();
    nav('/login');
  }, [setToken, setProfile]);

  /** DELETE ACCOUNT */
  const handleDeleteAccount = useCallback(async () => {
    if (!backendUrl || !token) {
      setDeleteError(new Error('Missing API base or auth token.'));
      return;
    }

    const base = backendUrl.replace(/\/+$/, '');
    const hit = async (path: string) =>
      fetch(`${base}${path}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

    try {
      setIsDeleting(true);
      setDeleteError(null);

      // try /me first, then /account
      let res = await hit('/api/user/me');
      if (res.status === 404) {
        res = await hit('/api/user/account');
      }
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const j = (await res.json()) as { message?: string };
          if (typeof j?.message === 'string') message = j.message;
        } catch {}
        throw new Error(message);
      }

      logout();
      nav('/'); // Landing
      alertFn?.('Your account was deleted.');
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e : new Error('Delete failed'));
    } finally {
      setIsDeleting(false);
    }
  }, [backendUrl, token, logout, alertFn]);

  return {
    // Google
    handleGoogleOAuthCode,
    handleGoogleLoginFailure,

    // Email/password
    loginWithEmail,
    registerWithEmail,
    sendResetOTP,
    resetPasswordWithOTP,

    // Session
    logout,

    // Deletion
    handleDeleteAccount,
    isDeleting,
    deleteError,
  };
};

export default useAuth;
