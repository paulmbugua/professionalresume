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

  /** --------------------
   * Google Login Success
   * -------------------- */
  const handleGoogleLoginSuccess = async (args: { credential: string }) => {
    console.log('▶️ handleGoogleLoginSuccess called with credential:', args.credential);
    try {
      // 1) Sign in via Google
      console.log('▶️ Calling loginApi.googleLogin');
      const googleRes = await loginApi.googleLogin(backendUrl, args.credential);
      console.log('🟢 loginApi.googleLogin response:', googleRes);

      if (!googleRes.success) {
        console.warn('⚠️ Google login unsuccessful:', googleRes.message);
        alertFn?.(googleRes.message);
        return;
      }

      // 2) Store JWT
      console.log('➡️ Storing JWT:', googleRes.token);
      setToken(googleRes.token!);

      // 3) Try fetching the “me” endpoint
      console.log('▶️ Fetching /api/user/me');
      let meResponse: { success: boolean; role?: string };
      try {
        const r = await fetch(`${backendUrl}/api/user/me`, {
          headers: { Authorization: `Bearer ${googleRes.token}` },
        });
        meResponse = await r.json();
      } catch (fetchErr) {
        console.error('🔴 fetch /me error:', fetchErr);
        meResponse = { success: false };
      }
      console.log('🟢 /api/user/me response:', meResponse);

      // 4) If backend says we already have a valid role, just set it
      if (meResponse.success && isValidRole(meResponse.role || '')) {
        console.log('➡️ User has existing role:', meResponse.role);
        setRole(meResponse.role as Role);
        setShowRoleModal(false);
      } else {
        console.log('➡️ No valid role found, showing role-picker modal');
        setShowRoleModal(true);
      }
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      console.error('🔴 handleGoogleLoginSuccess error:', e);
      alertFn?.(e.response?.data?.message || 'Google Login failed.');
    }
  };

  const handleGoogleLoginFailure = () => {
    console.log('⚠️ handleGoogleLoginFailure called');
    alertFn?.('Google Login was unsuccessful. Please try again.');
  };

  /** --------------------
   * OTP Request & Verify
   * -------------------- */
  const handleRequestOTP = async () => {
    console.log('▶️ handleRequestOTP for email:', email);
    try {
      const resp = await loginApi.requestOTP(backendUrl, email, token);
      console.log('🟢 requestOTP response:', resp);
      if (resp.success) {
        alertFn?.('OTP sent to your email.');
        setOtpSent(true);
      } else {
        alertFn?.(resp.message);
      }
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      console.error('🔴 requestOTP error:', e);
      alertFn?.(e.response?.data?.message || 'Failed to send OTP.');
    }
  };

  const handleOTPVerification = async () => {
    console.log('▶️ handleOTPVerification for email:', email, 'otp:', otp);
    try {
      const resp = await loginApi.verifyOTP(
        backendUrl,
        email,
        otp,
        newPassword,
        token,
      );
      console.log('🟢 verifyOTP response:', resp);
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
      console.error('🔴 verifyOTP error:', e);
      alertFn?.(e.response?.data?.message || 'OTP verification failed.');
    }
  };

  /** --------------------
   * Email/Password Login or Sign-Up
   * -------------------- */
  const handleFormSubmit = async () => {
    console.log('▶️ handleFormSubmit, state:', currentState, 'email:', email);
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
        console.log('▶️ Calling register with payload:', payload);
        response = await loginApi.register(backendUrl, payload, token);
      } else {
        console.log('▶️ Calling login with payload:', { email, password });
        response = await loginApi.login(backendUrl, { email, password }, token);
      }
      console.log('🟢 login/register response:', response);

      if (!response.success) {
        alertFn?.(response.message);
        return;
      }

      console.log('➡️ Storing JWT:', response.token);
      setToken(response.token!);
      alertFn?.(`${currentState} Successful!`);
      navigateFn?.('Home');
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      console.error('🔴 handleFormSubmit error:', e);
      alertFn?.(e.response?.data?.message || 'Server error, please try again.');
    }
  };

  /** --------------------
   * Role Update after Google First-Login
   * -------------------- */
  const handleRoleSubmit = async () => {
    console.log('▶️ handleRoleSubmit, selected role:', role);
    if (!isValidRole(role)) {
      alertFn?.('Please select a valid role.');
      return;
    }

    try {
      const payload: UpdateRolePayload =
        role === 'student'
          ? { userId: userId!, role, age, languages, ageGroup }
          : { userId: userId!, role };
      console.log('▶️ Calling updateRole with payload:', payload);

      const resp = await loginApi.updateRole(backendUrl, payload, token!);
      console.log('🟢 updateRole response:', resp);
      if (!resp.success) {
        alertFn?.(resp.message);
        return;
      }

      setShowRoleModal(false);
      setRole(role);
      alertFn?.('Role updated!');
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      console.error('🔴 handleRoleSubmit error:', e);
      alertFn?.(e.response?.data?.message || 'Failed to update role.');
    }
  };

  return {
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
    handleGoogleLoginSuccess,
    handleGoogleLoginFailure,
    handleRequestOTP,
    handleOTPVerification,
    handleFormSubmit,
    handleRoleSubmit,
  };
};

export default useAuth;
