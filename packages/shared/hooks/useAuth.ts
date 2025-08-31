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
import { useQueryClient } from '@tanstack/react-query';

export interface UseLoginOptions {
  alertFn?: (message: string) => void;
  navigateFn?: (destination?: string) => void; // default: caller routes to "/profile"
}

const NEED_ROLE_FLAG = 'auth:needsRole';
const PENDING_JWT_KEY = 'auth:pendingJwt';

const isValidRole = (v: unknown): v is Role => v === 'student' || v === 'tutor';

const useAuth = (options?: UseLoginOptions) => {
  const { alertFn, navigateFn } = options || {};
  const { token, setToken, backendUrl, userId } = useShopContext();

  const queryClient = useQueryClient();

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // ───────────────────────────────────────────────────────
  // Delete account state
  // ───────────────────────────────────────────────────────
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);

  const deleteAccount = async () => {
    if (!token) throw new Error('Not authenticated');
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await loginApi.deleteAccount(backendUrl, token);
    } catch (err) {
      const errorObj =
        err instanceof Error ? err : new Error((err as { message?: string })?.message ?? 'Failed to delete account');
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
    } catch (err) {
      alertFn?.(err instanceof Error ? err.message : 'Failed to delete account.');
    }
  };

  // ───────────────────────────────────────────────────────
  // Auth form state
  // ───────────────────────────────────────────────────────
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

  // For a brand-new Google user (no role yet)
  const [pendingJwt, setPendingJwt] = useState<string | null>(null);

  // Guard to avoid double-handling Google success (StrictMode/re-renders)
  const googleHandlingRef = useRef(false);

  // ───────────────────────────────────────────────────────
  // GOOGLE LOGIN — finish exchange, then navigate once
  // ───────────────────────────────────────────────────────
  const handleGoogleLoginSuccess = async (idToken: string): Promise<void> => {
    if (googleHandlingRef.current) return;
    googleHandlingRef.current = true;

    try {
      const googleRes = await loginApi.googleLogin(backendUrl, idToken);
      if (!googleRes?.success || !googleRes.token) {
        throw new Error(googleRes?.message || 'Google authentication failed');
      }

      const jwt = googleRes.token;
      const roleFromServer = (googleRes as Partial<{ role?: Role }>).role;

      // If backend already knows the role → we’re done
      if (isValidRole(roleFromServer)) {
        // Prime /me cache so UI is consistent immediately
        queryClient.setQueryData(['me'], (old: any) => {
          const safe = old && typeof old === 'object' ? old : {};
          return { ...safe, success: true, role: roleFromServer };
        });
        await setToken(jwt);
        // Optionally invalidate to refetch fresh details
        queryClient.invalidateQueries({ queryKey: ['me'] }).catch(() => {});
        navigateFn?.(); // default to /profile by caller
        return;
      }

      // Try a quick /me to confirm role
      try {
        const r = await fetch(`${backendUrl}/api/user/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (r.ok) {
          const me: { success: boolean; role?: Role } = await r.json();
          if (me?.success && isValidRole(me.role)) {
            queryClient.setQueryData(['me'], (old: any) => {
              const safe = old && typeof old === 'object' ? old : {};
              return { ...safe, success: true, role: me.role };
            });
            await setToken(jwt);
            queryClient.invalidateQueries({ queryKey: ['me'] }).catch(() => {});
            navigateFn?.();
            return;
          }
        }
      } catch {
        // ignore; will fall through to role collection
      }

      // Brand-new account → collect role here (DON’T navigate away)
      sessionStorage.setItem(PENDING_JWT_KEY, jwt);
      sessionStorage.setItem(NEED_ROLE_FLAG, '1');
      setPendingJwt(jwt);
      setShowRoleModal(true);
    } catch (err) {
      console.error('[googleLogin] error:', err);
      alertFn?.('Google sign-in failed. Please try again.');
    } finally {
      // allow another attempt if user retries
      googleHandlingRef.current = false;
    }
  };

  const handleGoogleLoginFailure = (): void => {
    alertFn?.('Google Login was unsuccessful. Please try again.');
  };

  // If we land (or remain) on /login and still need a role, open the modal
  useEffect(() => {
    if (!mountedRef.current) return;
    const needsRole = sessionStorage.getItem(NEED_ROLE_FLAG) === '1';
    const stored = sessionStorage.getItem(PENDING_JWT_KEY);
    if (needsRole && stored) {
      setPendingJwt(stored);
      setShowRoleModal(true);
      // keep flags until we actually finish role update
    }
  }, []);

  // ───────────────────────────────────────────────────────
  // OTP flow
  // ───────────────────────────────────────────────────────
  const handleRequestOTP = async () => {
    try {
      const resp = await loginApi.requestOTP(backendUrl, email, token);
      if (resp.success) {
        alertFn?.('OTP sent to your email.');
        setOtpSent(true);
      } else {
        alertFn?.(resp.message || 'Failed to send OTP.');
      }
    } catch (err) {
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
        alertFn?.(resp.message || 'OTP verification failed.');
      }
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'OTP verification failed.');
    }
  };

  // ───────────────────────────────────────────────────────
  // Email/password login & sign-up
  // ───────────────────────────────────────────────────────
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
        alertFn?.(response.message || 'Authentication failed.');
        return;
      }

      await setToken(response.token);
      alertFn?.(`${currentState} successful!`);
      // After password login/register, ensure /me is fresh
      queryClient.invalidateQueries({ queryKey: ['me'] }).catch(() => {});
      navigateFn?.();
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'Server error, please try again.');
    }
  };

  // ───────────────────────────────────────────────────────
  // Role picker (for new Google users)
  // ───────────────────────────────────────────────────────
  const handleRoleSubmit = async (): Promise<void> => {
    if (!isValidRole(role)) {
      alertFn?.('Please select a valid role.');
      return;
    }

    if (role === 'student') {
      if (!age || !languages?.length || !ageGroup) {
        alertFn?.('Please fill age, language, and age group.');
        return;
      }
      const trimmed = name.trim();
      if (!trimmed || trimmed.length < 2) {
        alertFn?.('Please provide your full name (min 2 characters).');
        return;
      }
      const ageNum = Number(age);
      if (!Number.isFinite(ageNum) || ageNum <= 0) {
        alertFn?.('Please enter a valid age.');
        return;
      }
    }

    try {
      const auth = pendingJwt ?? token;
      if (!auth) {
        alertFn?.('Missing auth token after Google sign-in.');
        return;
      }

      // Ensure userId is a string for UpdateRolePayload
      const userIdStr =
        typeof userId === 'string'
          ? userId
          : userId != null
            ? String(userId)
            : '';

      const trimmedName = name.trim();

      // Build a payload that matches your shared type: age must be a string
      const payload: UpdateRolePayload & { name?: string } =
        role === 'student'
          ? {
              userId: userIdStr,
              role,                         // 'student'
              age: String(Number(age)),     // string
              languages,
              ageGroup,
              name: trimmedName,            // included for student
            }
          : {
              userId: userIdStr,
              role,                         // 'tutor'
            };

      const resp = await loginApi.updateRole(backendUrl, payload, auth);
      if (!resp.success) {
        alertFn?.(resp.message || 'Failed to update role.');
        return;
      }

      // Ensure the JWT is in place for subsequent requests
      if (!token) await setToken(auth);

      // 🔥 Immediately reflect the new role in the UI
      queryClient.setQueryData(['me'], (old: any) => {
        const safe = old && typeof old === 'object' ? old : {};
        return { ...safe, success: true, role };
      });
      await queryClient.invalidateQueries({ queryKey: ['me'] });

      // Clear session flags now that we’re done
      sessionStorage.removeItem(PENDING_JWT_KEY);
      sessionStorage.removeItem(NEED_ROLE_FLAG);
      setPendingJwt(null);
      setShowRoleModal(false);

      alertFn?.('Role updated!');
      navigateFn?.();
    } catch (err) {
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
    handleGoogleLoginSuccess,
    handleGoogleLoginFailure,
    handleRequestOTP,
    handleOTPVerification,
    handleFormSubmit,
    handleRoleSubmit,
  };
};

export default useAuth;
