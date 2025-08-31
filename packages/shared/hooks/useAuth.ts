// packages/shared/hooks/useAuth.ts
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import * as api from '@mytutorapp/shared/api';

import type {
  AuthPayload,
  RegisterPayload,
  UpdateRolePayload,
  AuthResponse,
} from '@mytutorapp/shared/types';

export interface UseLoginOptions {
  alertFn?: (message: string) => void;
  navigateFn?: (destination?: string) => void;
}

/** LocalStorage coordination keys */
const NEED_ROLE_FLAG = 'auth:needsRole';
const PENDING_JWT_KEY = 'auth:pendingJwt';

function setNeedRoleFlag(on: boolean) {
  if (on) localStorage.setItem(NEED_ROLE_FLAG, '1');
  else localStorage.removeItem(NEED_ROLE_FLAG);
}
function getNeedRoleFlag() {
  return localStorage.getItem(NEED_ROLE_FLAG) === '1';
}
function setPendingJwt(jwt: string | null) {
  if (jwt) localStorage.setItem(PENDING_JWT_KEY, jwt);
  else localStorage.removeItem(PENDING_JWT_KEY);
}
function getPendingJwt() {
  return localStorage.getItem(PENDING_JWT_KEY) || null;
}
function clearAuthFlags() {
  setNeedRoleFlag(false);
  setPendingJwt(null);
}

const useAuth = (options?: UseLoginOptions) => {
  const { alertFn, navigateFn } = options || {};
  // ⬇️ pull token from context (you were missing this)
  const { setToken, backendUrl, token } = useShopContext();

  const navigate = useNavigate();
  const nav = navigateFn || navigate;

  // ⬇️ add missing state imports/defs
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);

  /** GOOGLE FLOW */
  const handleGoogleLoginSuccess = useCallback(
    async (idToken: string) => {
      try {
        const resp = await api.googleLogin(backendUrl, idToken);
        const jwt = resp?.token;
        const role = (resp as any)?.role ?? null;

        if (!jwt) throw new Error('No JWT returned from googleLogin');

        if (role) {
          setToken(jwt);
          clearAuthFlags();
          nav('/home');
          return;
        }

        setPendingJwt(jwt);
        setNeedRoleFlag(true);
        nav('/profile/me');
      } catch (e: any) {
        clearAuthFlags();
        alertFn?.(e?.message || 'Google authentication failed');
        throw e;
      }
    },
    [backendUrl, nav, setToken, alertFn]
  );

  const handleGoogleLoginFailure = useCallback(
    (error?: Error) => {
      clearAuthFlags();
      alertFn?.(error?.message || 'Google sign-in failed');
    },
    [alertFn]
  );

  /** Complete role selection using the pending JWT */
  const completeRole = useCallback(
    async (payload: UpdateRolePayload) => {
      const pending = getPendingJwt();
      if (!pending) throw new Error('Missing pending JWT');
      await api.updateRole(backendUrl, payload, pending);
      setToken(pending);
      clearAuthFlags();
      nav('/home');
    },
    [backendUrl, nav, setToken]
  );

  /** EMAIL/PASSWORD FLOWS */
  const loginWithEmail = useCallback(
    async (payload: AuthPayload): Promise<AuthResponse> => {
      const resp = await api.login(backendUrl, payload);
      if (resp?.token) {
        setToken(resp.token);
        clearAuthFlags();
      }
      return resp;
    },
    [backendUrl, setToken]
  );

  const registerWithEmail = useCallback(
    async (payload: RegisterPayload): Promise<AuthResponse> => {
      const resp = await api.register(backendUrl, payload);
      if (resp?.token) {
        setToken(resp.token);
        clearAuthFlags();
      }
      return resp;
    },
    [backendUrl, setToken]
  );

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
    setToken(''); // ShopContext treats empty as logged out
    clearAuthFlags();
    nav('/login');
  }, [nav, setToken]);

  /** Helpers */
  const isRoleModalNeeded = useCallback(() => getNeedRoleFlag(), []);
  const getPendingJwtForDebug = useCallback(() => getPendingJwt(), []);

  /** DELETE ACCOUNT */
  const handleDeleteAccount = useCallback(async () => {
    if (!backendUrl || !token) {
      setDeleteError(new Error('Missing API base or auth token.'));
      return;
    }
    try {
      setIsDeleting(true);
      setDeleteError(null);

      const res = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/user/me`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `HTTP ${res.status}`);
      }

      // Local cleanup + navigation
      logout();
      // If caller provided navigateFn and wants to override, they still can:
      navigateFn?.('/');
      alertFn?.('Your account was deleted.');
    } catch (e: any) {
      setDeleteError(e);
    } finally {
      setIsDeleting(false);
    }
  }, [backendUrl, token, logout, navigateFn, alertFn]);

  return {
    // Google
    handleGoogleLoginSuccess,
    handleGoogleLoginFailure,
    completeRole,

    // Email/password
    loginWithEmail,
    registerWithEmail,
    sendResetOTP,
    resetPasswordWithOTP,

    // Session
    logout,

    // UI helpers
    isRoleModalNeeded,
    getPendingJwt: getPendingJwtForDebug,
    clearAuthFlags,

    // Deletion
    handleDeleteAccount,
    isDeleting,
    deleteError,
  };
};

export default useAuth;
