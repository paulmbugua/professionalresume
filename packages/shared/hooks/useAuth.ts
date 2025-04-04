import { AxiosError } from 'axios';
import { useState } from 'react';
import { useShopContext } from '@shared/context';
import * as loginApi from '@shared/api';
import type {
  Role,
  RegisterPayload,
  UpdateRolePayload,
  AuthResponse,
} from '@shared/types';

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
  const [role, setRole] = useState<Role | ''>(''); // allows empty initially
  const [age, setAge] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [ageGroup, setAgeGroup] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);

  const isValidRole = (value: string): value is Role => value === 'student' || value === 'tutor';

  const handleGoogleLoginSuccess = async (credentialResponse: { credential: string }) => {
    try {
      const googleRes = await loginApi.googleLogin(backendUrl, credentialResponse.credential);

      if (googleRes.success) {
        setToken(googleRes.token!);
        console.log("Token set in useAuth:", googleRes.token);
        const meResponse = await fetch(`${backendUrl}/api/user/me`, {
          headers: { Authorization: `Bearer ${googleRes.token}` },
        }).then(res => res.json());

        if (meResponse.success) {
          if (isValidRole(meResponse.role)) {
            setRole(meResponse.role);
            navigateFn?.('/');
          } else {
            setShowRoleModal(true);
          }
        } else {
          alertFn?.('Failed to fetch user data.');
        }
      } else {
        alertFn?.(googleRes.message);
      }
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      alertFn?.(err.response?.data?.message || 'Google Login failed.');
    }
  };

  const handleGoogleLoginFailure = () => {
    alertFn?.('Google Login was unsuccessful. Please try again.');
  };

  const handleRequestOTP = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await loginApi.requestOTP(backendUrl, email, token);
      if (response.success) {
        alertFn?.('OTP sent to your email.');
        setOtpSent(true);
      } else {
        alertFn?.(response.message);
      }
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      alertFn?.(err.response?.data?.message || 'Failed to send OTP.');
    }
  };

  const handleOTPVerification = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await loginApi.verifyOTP(backendUrl, email, otp, newPassword, token);
      if (response.success) {
        alertFn?.('Password reset successful!');
        setForgotPassword(false);
        setOtpSent(false);
        setCurrentState('Login');
      } else {
        alertFn?.(response.message);
      }
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      alertFn?.(err.response?.data?.message || 'OTP verification failed.');
    }
  };

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (currentState === 'Sign Up' && !isValidRole(role)) {
      alertFn?.('Please select a valid role.');
      return;
    }

    try {
      let response: AuthResponse;

      if (currentState === 'Sign Up') {
        if (!isValidRole(role)) {
          alertFn?.('Please select a valid role.');
          return;
        }
      
        const payload: RegisterPayload =
          role === 'student'
            ? { name, email, password, role, age, languages, ageGroup }
            : { name, email, password, role };
      
        response = await loginApi.register(backendUrl, payload, token);
      } else {
        response = await loginApi.login(backendUrl, { email, password }, token);
      }
      
      if (response.success) {
        setToken(response.token!);
        alertFn?.(`${currentState} Successful!`);
        navigateFn?.('/');
      } else {
        alertFn?.(response.message);
      }
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      alertFn?.(err.response?.data?.message || 'Server error, please try again.');
    }
  };

  const handleRoleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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

      if (response.success) {
        alertFn?.('Google Login Successful!');
        setShowRoleModal(false);
        navigateFn?.('/');
      } else {
        alertFn?.(response.message);
      }
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      alertFn?.(err.response?.data?.message || 'Failed to update role.');
    }
  };

  return {
    currentState,
    setCurrentState,
    forgotPassword,
    setForgotPassword,
    otpSent,
    setOtpSent,
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
