// packages/shared/hooks/useAuth.ts

import { AxiosError } from 'axios';
import { useState } from 'react';
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
  navigateFn?: (destination?: string) => void; // destination is ignored by our caller; it always routes to "/"
}

const useAuth = (options?: UseLoginOptions) => {
  const { alertFn, navigateFn } = options || {};
  const { token, setToken, backendUrl, userId } = useShopContext();

  //
  // ─── DELETE ACCOUNT STATE & HANDLERS ───────────────────────────────────────
  //
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
      await setToken(''); // clear auth
      alertFn?.('Your account has been deleted.');
      navigateFn?.('/goodbye');
    } catch (err: any) {
      alertFn?.(err.message);
    }
  };

  //
  // ─── AUTH FORM STATE ───────────────────────────────────────────────────────
  //
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

  // Keep Google JWT locally until role is finalized to avoid races in context
  const [pendingJwt, setPendingJwt] = useState<string | null>(null);

  const isValidRole = (value: string): value is Role =>
    value === 'student' || value === 'tutor';

  //
  // ─── GOOGLE LOGIN (PENDING JWT FLOW) ───────────────────────────────────────
  //
  const handleGoogleLoginSuccess = async (idToken: string) => {
    try {
      const googleRes = await loginApi.googleLogin(backendUrl, idToken);
      if (!googleRes.success || !googleRes.token) {
        alertFn?.(googleRes.message || 'Google authentication failed');
        return;
      }

      const jwt = googleRes.token;

      // 1) Do NOT set the global token yet—keep it pending until role is confirmed/known.
      setPendingJwt(jwt);

      // 2) Decide if user already has a role using the fresh JWT directly.
      let me: { success?: boolean; role?: string } = { success: false };
      try {
        const r = await fetch(`${backendUrl}/api/user/me`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        me = r.ok ? await r.json() : { success: false };
      } catch {
        me = { success: false };
      }

      if (me.success && isValidRole(me.role ?? '')) {
        // Existing user: finalize — store token globally and route (App will decide /profile/me vs /home)
        setRole(me.role as Role);
        setShowRoleModal(false);

        await setToken(jwt);
        setPendingJwt(null);

        // Let the App router handle first-login vs normal flow
        navigateFn?.();
      } else {
        // New Google user: show role picker
        setShowRoleModal(true);
      }
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || (e as any)?.message || 'Google Login failed.');
    }
  };

  const handleGoogleLoginFailure = () => {
    alertFn?.('Google Login was unsuccessful. Please try again.');
  };

  //
  // ─── OTP (“Reset Password”) FLOW ───────────────────────────────────────────
  //
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

  //
  // ─── EMAIL/PASSWORD LOGIN & SIGN‐UP ────────────────────────────────────────
  //
  const handleFormSubmit = async () => {
    // If signing up, ensure they picked a valid role
    if (currentState === 'Sign Up' && !isValidRole(role)) {
      alertFn?.('Please select a valid role.');
      return;
    }

    try {
      let response: AuthResponse;

      if (currentState === 'Sign Up') {
        // build register payload
        const payload: RegisterPayload =
          role === 'student'
            ? { name, email, password, role, age, languages, ageGroup }
            : { name, email, password, role: role as Role };

        response = await loginApi.register(backendUrl, payload, token);
      } else {
        // login payload
        response = await loginApi.login(backendUrl, { email, password }, token);
      }

      if (!response.success || !response.token) {
        alertFn?.(response.message || 'Authentication failed');
        return;
      }

      // store JWT globally (email/password flow does not need the pending-JWT trick)
      await setToken(response.token);
      alertFn?.(`${currentState} successful!`);

      // ⬇️ Let App router decide where to go (first-login vs normal)
      navigateFn?.();
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'Server error, please try again.');
    }
  };

  //
  // ─── ROLE‐PICKER SUBMISSION (for new Google users) ────────────────────────
  //
  const handleRoleSubmit = async () => {
    if (!isValidRole(role)) {
      alertFn?.('Please select a valid role.');
      return;
    }

    // Student-specific validation
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
      // Use pendingJwt when present (brand-new Google user); fall back to global token otherwise
      const auth = pendingJwt ?? token;
      if (!auth) {
        alertFn?.('Missing auth token after Google sign-in.');
        return;
      }

      // Include student name when role === 'student' so backend can set it
      const payload: (UpdateRolePayload & { name?: string }) =
        role === 'student'
          ? { userId: userId as any, role, age, languages, ageGroup, name }
          : { userId: userId as any, role };

      const resp = await loginApi.updateRole(backendUrl, payload as UpdateRolePayload, auth);
      if (!resp.success) {
        alertFn?.(resp.message || 'Failed to update role.');
        return;
      }

      // Role saved server-side → finalize global auth (if not already), clear pending state, close modal
      if (!token) await setToken(auth);
      setPendingJwt(null);
      setShowRoleModal(false);

      alertFn?.('Role updated!');

      // ⬇️ Let App router decide where to go (first-login vs normal)
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
    handleGoogleLoginSuccess,
    handleGoogleLoginFailure,
    handleRequestOTP,
    handleOTPVerification,
    handleFormSubmit,
    handleRoleSubmit,
  };
};

export default useAuth;
