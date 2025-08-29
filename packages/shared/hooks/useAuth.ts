// packages/shared/hooks/useAuth.ts
import { AxiosError } from 'axios';
import { useEffect, useRef, useState } from 'react';
import { useShopContext } from '@mytutorapp/shared/context';
import * as loginApi from '@mytutorapp/shared/api';
import type {
  Role,
  RegisterPayload,
  UpdateRolePayload,
  AuthResponse,
} from '@mytutorapp/shared/types';

export interface UseLoginOptions {
  alertFn?: (message: string) => void;
  navigateFn?: (destination?: string) => void; // caller routes to "/profile"
}

const NEED_ROLE_FLAG = 'auth:needsRole';
const PENDING_JWT_KEY = 'auth:pendingJwt';

const useAuth = (options?: UseLoginOptions) => {
  const { alertFn, navigateFn } = options || {};
  const { token, setToken, backendUrl, userId } = useShopContext();

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Delete account state
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);

  const deleteAccount = async () => {
    if (!token) throw new Error('Not authenticated');
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await loginApi.deleteAccount(backendUrl, token);
    } catch (err: unknown) {
      const errorObj =
        err instanceof Error ? err : new Error((err as any)?.message ?? 'Failed to delete account');
      setDeleteError(errorObj);
      throw errorObj;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      await setToken('');
      alertFn?.('Your account has been deleted.');
      navigateFn?.('/goodbye');
    } catch (err: any) {
      alertFn?.(err.message);
    }
  };

  // Auth form state
  const [currentState, setCurrentState] = useState<'Login' | 'Sign Up'>('Login');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [age, setAge] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [ageGroup, setAgeGroup] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Google pending JWT for brand-new users
  const [pendingJwt, setPendingJwt] = useState<string | null>(null);

  const isValidRole = (v: string): v is Role => v === 'student' || v === 'tutor';

  // GOOGLE LOGIN — instant nav; finish exchange in background
  const handleGoogleLoginSuccess = async (idToken: string): Promise<void> => {
    // navigate immediately so there is no “holding” frame
    navigateFn?.(); // your LoginPage passes navigate('/profile', { replace: true })

    // finish exchange without blocking this async (we won't await this)
    const finish = async () => {
      try {
        const googleRes = await loginApi.googleLogin(backendUrl, idToken);
        if (!googleRes?.success || !googleRes.token) {
          throw new Error(googleRes?.message || 'Google authentication failed');
        }

        const jwt = googleRes.token;
        const roleFromServer = (googleRes as any).role as Role | undefined;

        if (roleFromServer === 'student' || roleFromServer === 'tutor') {
          await setToken(jwt);
          return;
        }

        // fallback quick /me
        try {
          const r = await fetch(`${backendUrl}/api/user/me`, {
            headers: { Authorization: `Bearer ${jwt}` },
          });
          const me = r.ok ? await r.json() : { success: false };
          if (me?.success && (me.role === 'student' || me.role === 'tutor')) {
            await setToken(jwt);
            return;
          }
        } catch { /* ignore */ }

        // brand-new user → collect role on /login
        sessionStorage.setItem(PENDING_JWT_KEY, jwt);
        localStorage.setItem(NEED_ROLE_FLAG, '1');
        window.location.replace('/login');
      } catch (err) {
        console.error('[googleLogin] failed after navigation:', err);
        alertFn?.('Google sign-in failed. Please try again.');
        window.location.replace('/login');
      }
    };

    void finish(); // fire-and-forget so this async resolves immediately
  };

  const handleGoogleLoginFailure = (): void => {
    alertFn?.('Google Login was unsuccessful. Please try again.');
  };

  // If we bounced back to /login to pick a role, auto-open the modal
  useEffect(() => {
    if (!mountedRef.current) return;
    const needsRole = localStorage.getItem(NEED_ROLE_FLAG) === '1';
    const stored = sessionStorage.getItem(PENDING_JWT_KEY);
    if (needsRole && stored) {
      setPendingJwt(stored);
      setShowRoleModal(true);
      localStorage.removeItem(NEED_ROLE_FLAG);
    }
  }, []);

  // OTP flow
  const handleRequestOTP = async () => {
    try {
      const resp = await loginApi.requestOTP(backendUrl, email, token);
      if (resp.success) {
        alertFn?.('OTP sent to your email.');
        setOtpSent(true);
      } else {
        alertFn?.(resp.message);
      }
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'Failed to send OTP.');
    }
  };

  const handleOTPVerification = async () => {
    try {
      const resp = await loginApi.verifyOTP(backendUrl, email, otp, newPassword, token);
      if (resp.success) {
        alertFn?.('Password reset successful!');
        setForgotPassword(false);
        setOtpSent(false);
        setCurrentState('Login');
      } else {
        alertFn?.(resp.message);
      }
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'OTP verification failed.');
    }
  };

  // Email/password login & sign-up
  const handleFormSubmit = async () => {
    if (currentState === 'Sign Up' && !isValidRole(role)) {
      alertFn?.('Please select a valid role.');
      return;
    }

    try {
      let response: AuthResponse;

      if (currentState === 'Sign Up') {
        const payload: RegisterPayload =
          role === 'student'
            ? { name, email, password, role, age, languages, ageGroup }
            : { name, email, password, role: role as Role };

        response = await loginApi.register(backendUrl, payload, token);
      } else {
        response = await loginApi.login(backendUrl, { email, password }, token);
      }

      if (!response.success || !response.token) {
        alertFn?.(response.message || 'Authentication failed');
        return;
      }

      await setToken(response.token);
      alertFn?.(`${currentState} successful!`);
      navigateFn?.();
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'Server error, please try again.');
    }
  };

  // Role picker (new Google users)
  const handleRoleSubmit = async () => {
    if (!isValidRole(role)) {
      alertFn?.('Please select a valid role.');
      return;
    }

    if (role === 'student') {
      if (!age || !languages?.length || !ageGroup) {
        alertFn?.('Please fill age, language, and age group.');
        return;
      }
      if (!name || name.trim().length < 2) {
        alertFn?.('Please provide your full name (min 2 characters).');
        return;
      }
    }

    try {
      const auth = pendingJwt ?? token;
      if (!auth) {
        alertFn?.('Missing auth token after Google sign-in.');
        return;
      }

      const payload: (UpdateRolePayload & { name?: string }) =
        role === 'student'
          ? { userId: userId as any, role, age, languages, ageGroup, name }
          : { userId: userId as any, role };

      const resp = await loginApi.updateRole(backendUrl, payload as UpdateRolePayload, auth);
      if (!resp.success) {
        alertFn?.(resp.message || 'Failed to update role.');
        return;
      }

      if (!token) await setToken(auth);
      sessionStorage.removeItem(PENDING_JWT_KEY);
      setPendingJwt(null);
      setShowRoleModal(false);

      alertFn?.('Role updated!');
      navigateFn?.();
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'Failed to update role.');
    }
  };

  return {
    // delete
    handleDeleteAccount,
    isDeleting,
    deleteError,

    // form
    currentState,
    setCurrentState,
    forgotPassword,
    setForgotPassword,
    otpSent,
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    role,
    setRole,
    age,
    setAge,
    languages,
    setLanguages,
    ageGroup,
    setAgeGroup,
    newPassword,
    setNewPassword,
    otp,
    setOtp,
    showRoleModal,

    // handlers
    handleGoogleLoginSuccess,   // now Promise<void>
    handleGoogleLoginFailure,
    handleRequestOTP,
    handleOTPVerification,
    handleFormSubmit,
    handleRoleSubmit,
  };
};

export default useAuth;
