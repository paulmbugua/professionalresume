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

  const handleGoogleLoginSuccess = async ({
    credential,
  }: {
    credential: string;
  }) => {
    try {
      const googleRes = await loginApi.googleLogin(backendUrl, credential);
      if (!googleRes.success) {
        alertFn?.(googleRes.message);
        return;
      }
      setToken(googleRes.token!);
      // fetch profile…
      const meResponse = await fetch(`${backendUrl}/api/user/me`, {
        headers: { Authorization: `Bearer ${googleRes.token}` },
      }).then((r) => r.json());

      if (meResponse.success) {
        if (isValidRole(meResponse.role)) {
          setRole(meResponse.role);
          navigateFn?.('Home');          // ← NAVIGATE AFTER SUCCESS
        } else {
          setShowRoleModal(true);
        }
      } else {
        alertFn?.('Failed to fetch user data.');
      }
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'Google Login failed.');
    }
  };

  const handleGoogleLoginFailure = () => {
    alertFn?.('Google Login was unsuccessful. Please try again.');
  };

  const handleRequestOTP = async () => {
    try {
      const response = await loginApi.requestOTP(backendUrl, email, token);
      if (response.success) {
        alertFn?.('OTP sent to your email.');
        setOtpSent(true);
      } else {
        alertFn?.(response.message);
      }
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'Failed to send OTP.');
    }
  };

  const handleOTPVerification = async () => {
    try {
      const response = await loginApi.verifyOTP(
        backendUrl,
        email,
        otp,
        newPassword,
        token,
      );
      if (response.success) {
        alertFn?.('Password reset successful!');
        setForgotPassword(false);
        setOtpSent(false);
        setCurrentState('Login');
      } else {
        alertFn?.(response.message);
      }
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'OTP verification failed.');
    }
  };

  const handleFormSubmit = async () => {
    // no event.preventDefault()
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

      if (!response.success) {
        alertFn?.(response.message);
        return;
      }

      setToken(response.token!);
      alertFn?.(`${currentState} Successful!`);
      navigateFn?.('Home');           // ← NAVIGATE AFTER SIGN UP / LOGIN
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
      alertFn?.(e.response?.data?.message || 'Server error, please try again.');
    }
  };

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
      const response = await loginApi.updateRole(backendUrl, payload, token!);
      if (!response.success) {
        alertFn?.(response.message);
        return;
      }
      alertFn?.('Role updated!');
      navigateFn?.('Home');          // ← NAVIGATE AFTER ROLE UPDATE
    } catch (err: unknown) {
      const e = err as AxiosError<{ message?: string }>;
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
    setShowRoleModal,
    handleGoogleLoginSuccess,
    handleGoogleLoginFailure,
    handleRequestOTP,
    handleOTPVerification,
    handleFormSubmit,
    handleRoleSubmit,
  };
};

export default useAuth;
