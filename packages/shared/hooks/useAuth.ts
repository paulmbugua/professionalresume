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
  navigateFn?: (destination: string) => void;
}

const useAuth = (options?: UseLoginOptions) => {
  const { alertFn, navigateFn } = options || {};
  const { token, setToken, backendUrl, userId } = useShopContext();

  //
  // ─── DELETE ACCOUNT STATE & HANDLERS ─────────────────────────────────────────────
  //
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<Error | null>(null);

  const deleteAccount = async () => {
    if (!token) throw new Error('Not authenticated');
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await loginApi.deleteAccount(backendUrl, token);
    } catch (err: any) {
      const errorObj = err instanceof Error
        ? err
        : new Error(err?.message ?? 'Failed to delete account');
      setDeleteError(errorObj);
      throw errorObj;
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccount();
      setToken(''); // clear auth
      alertFn?.('Your account has been deleted.');
      navigateFn?.('/goodbye');
    } catch (err: any) {
      alertFn?.(err.message);
    }
  };

  //
  // ─── AUTH FORM STATE ───────────────────────────────────────────────────────────────
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

  const isValidRole = (value: string): value is Role =>
    value === 'student' || value === 'tutor';

  //
  // ─── GOOGLE LOGIN ────────────────────────────────────────────────────────────────
  //
  const handleGoogleLoginSuccess = async (idToken: string) => {
    try {
      const googleRes = await loginApi.googleLogin(backendUrl, idToken);
      if (!googleRes.success) {
        alertFn?.(googleRes.message);
        return;
      }

      // 1) store JWT
      setToken(googleRes.token!);

      // 2) fetch /me to see if we already have a role
      const r = await fetch(`${backendUrl}/api/user/me`, {
        headers: { Authorization: `Bearer ${googleRes.token}` },
      });
      const me = await r.json().catch(() => ({ success: false }));

      if (me.success && isValidRole(me.role || '')) {
        // existing user: no need to pick a role
        setRole(me.role as Role);
        setShowRoleModal(false);

        // NAVIGATE HOME
        navigateFn?.('/');
      } else {
        // new Google user: show role‐picker
        setShowRoleModal(true);
      }
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'Google Login failed.');
    }
  };

  const handleGoogleLoginFailure = () => {
    alertFn?.('Google Login was unsuccessful. Please try again.');
  };

  //
  // ─── OTP (“Reset Password”) FLOW ─────────────────────────────────────────────────
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
      const resp = await loginApi.verifyOTP(
        backendUrl,
        email,
        otp,
        newPassword,
        token
      );
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
  // ─── EMAIL/PASSWORD LOGIN & SIGN‐UP ─────────────────────────────────────────────
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

      if (!response.success) {
        alertFn?.(response.message);
        return;
      }

      // store JWT
      setToken(response.token!);
      alertFn?.(`${currentState} successful!`);

      // NAVIGATE HOME
      navigateFn?.('/');
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'Server error, please try again.');
    }
  };

  //
  // ─── ROLE‐PICKER SUBMISSION ─────────────────────────────────────────────────────
  //
  const handleRoleSubmit = async () => {
    if (!isValidRole(role)) {
      alertFn?.('Please select a valid role.');
      return;
    }

    try {
      const payload: UpdateRolePayload =
        role === 'student'
          ? { userId: userId!, role, age, languages, ageGroup }
          : { userId: userId!, role };

      const resp = await loginApi.updateRole(backendUrl, payload, token!);
      if (!resp.success) {
        alertFn?.(resp.message);
        return;
      }

      setShowRoleModal(false);
      setRole(role);
      alertFn?.('Role updated!');

      // NAVIGATE HOME
      navigateFn?.('/');
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
