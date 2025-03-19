// /packages/shared/hooks/useAuth.ts
import { useState, useContext } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { toast } from 'react-toastify';
import { ShopContext } from '../context/ShopContext';
import { useSafeNavigate } from '../utils/navigation';

import {
  googleLogin,
  fetchUser,
  requestOTP,
  verifyOTP,
  auth,
  updateRole,
} from '../api/authApi';

const WEB_CLIENT_ID = "309635970564-j3466abkbgp3giep99aueh3d4pdhkus3.apps.googleusercontent.com";
// For native platforms, GoogleSignin is already configured in index.tsx.
// Optionally, configure for web if needed.
if (Platform.OS === 'web') {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID, // Use your web client ID for web configuration
    offlineAccess: true,
  });
}

export const useAuth = () => {
  // Local states for toggling views and storing form values
  const [currentState, setCurrentState] = useState<'Login' | 'Sign Up'>('Login');
  const [forgotPassword, setForgotPassword] = useState<boolean>(false);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [age, setAge] = useState<string>('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [ageGroup, setAgeGroup] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);

  // Retrieve context values for token and backendUrl
  const { token, setToken, backendUrl } = useContext(ShopContext)!;
  const navigate = useSafeNavigate();

  // Mobile Google Sign-In handler – using native GoogleSignin
  const handleMobileGoogleSignIn = async () => {
    console.log("📱 Starting Mobile Google Sign-In");
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log("✅ Google Play Services Available");
  
      const userInfo = await GoogleSignin.signIn();
      console.log("🔑 Google Sign-In Successful:", userInfo);
  
      const idToken = (userInfo as any).idToken;
      if (!idToken) {
        console.error("❌ No Google ID token returned.");
        toast.error("No Google ID token found.");
        return;
      }
  
      console.log("🔄 Sending ID Token to Backend...");
      const googleResponse = await googleLogin(backendUrl, idToken);
      console.log("✅ Backend Google Response:", googleResponse.data);
  
      if (googleResponse.data.success) {
        setToken(googleResponse.data.token);
        await AsyncStorage.setItem("token", googleResponse.data.token);
  
        const meResponse = await fetchUser(backendUrl, googleResponse.data.token);
        console.log("👤 User Data:", meResponse.data);
  
        if (meResponse.data.success) {
          navigate("/");
        } else {
          toast.error("❌ Failed to fetch user data.");
        }
      } else {
        toast.error(googleResponse.data.message);
      }
    } catch (error: any) {
      console.error("🚨 Mobile Google Login Error:", error);
      toast.error("Google Login failed: " + error.message);
    }
  };
  

  // Combined handler for Google login for both web and mobile.
  const handleGoogleLogin = async (credentialResponse?: any) => {
    console.log("🛠 Google Login Initiated"); // Debug Log
    
    if (Platform.OS === "web") {
      try {
        console.log("🌍 Web Login Attempt");
        console.log("Credential Response:", credentialResponse);
  
        if (!credentialResponse || !credentialResponse.credential) {
          console.error("❌ No credential received.");
          toast.error("No Google credentials found.");
          return;
        }
  
        const googleResponse = await googleLogin(backendUrl, credentialResponse.credential);
        console.log("✅ Google Login Response:", googleResponse.data);
  
        if (googleResponse.data.success) {
          setToken(googleResponse.data.token);
          localStorage.setItem("token", googleResponse.data.token);
  
          const meResponse = await fetchUser(backendUrl, googleResponse.data.token);
          console.log("👤 User Data:", meResponse.data);
  
          if (meResponse.data.success) {
            if (meResponse.data.role) {
              setRole(meResponse.data.role);
              navigate("/");
            } else {
              setShowRoleModal(true);
            }
          } else {
            toast.error("❌ Failed to fetch user data.");
          }
        } else {
          toast.error(googleResponse.data.message);
        }
      } catch (error: unknown) {
        console.error("🚨 Web Google Login Failed:", error);
        toast.error("Google Login failed.");
      }
    } else {
      console.log("📱 Mobile Google Sign-In Attempt");
      await handleMobileGoogleSignIn();
    }
  };
  

  // OTP Flow Handlers
  const handleRequestOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const response = await requestOTP(backendUrl, email, token);
      if (response.data.success) {
        toast.success('OTP sent to your email.');
        setOtpSent(true);
      } else {
        toast.error(response.data.message);
      }
    } catch (error: unknown) {
      toast.error('Failed to send OTP.');
    }
  };

  const handleOTPVerification = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const response = await verifyOTP(backendUrl, email, otp, newPassword, token);
      if (response.data.success) {
        toast.success('Password reset successful!');
        setForgotPassword(false);
        setOtpSent(false);
        setCurrentState('Login');
      } else {
        toast.error(response.data.message);
      }
    } catch (error: unknown) {
      toast.error('OTP verification failed.');
    }
  };

  // Login/Sign Up Handler
  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (currentState === 'Sign Up' && !role) {
      toast.error('Please select a role.');
      return;
    }
    try {
      const endpoint = currentState === 'Sign Up' ? '/api/user/register' : '/api/user/login';
      const payload =
        currentState === 'Sign Up'
          ? role === 'student'
            ? { name, email, password, role, age, languages, ageGroup }
            : { name, email, password, role }
          : { email, password };

      const response = await auth(backendUrl, endpoint, payload, token);
      if (response.data.success) {
        setToken(response.data.token);
        if (Platform.OS === 'web') {
          localStorage.setItem('token', response.data.token);
        } else {
          await AsyncStorage.setItem('token', response.data.token);
        }
        toast.success(`${currentState} Successful!`);
        navigate('/');
      } else {
        toast.error(response.data.message);
      }
    } catch (error: unknown) {
      toast.error('Server error, please try again.');
    }
  };

  // Inline Role Update for Google Login Users
  const handleRoleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!role) {
      toast.error('Please select a role.');
      return;
    }
    try {
      const payload = role === 'student'
        ? { role, age, languages, ageGroup }
        : { role };

      const response = await updateRole(backendUrl, payload, token);
      if (response.data.success) {
        toast.success('Google Login Successful!');
        setShowRoleModal(false);
        navigate('/');
      } else {
        toast.error(response.data.message);
      }
    } catch (error: unknown) {
      toast.error('Failed to update role.');
    }
  };

  return {
    currentState, setCurrentState,
    forgotPassword, setForgotPassword,
    otpSent, setOtpSent,
    email, setEmail,
    password, setPassword,
    name, setName,
    role, setRole,
    age, setAge,
    languages, setLanguages,
    ageGroup, setAgeGroup,
    newPassword, setNewPassword,
    otp, setOtp,
    showRoleModal, setShowRoleModal,
    handleGoogleLogin, // Combined Google login handler
    handleRequestOTP,
    handleOTPVerification,
    handleFormSubmit,
    handleRoleSubmit,
  };
};
