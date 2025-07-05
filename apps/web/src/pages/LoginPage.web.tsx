// apps/web/src/pages/LoginPage.web.tsx

import React, { useContext, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { assets } from '../assets/assets';
import { useAuth } from '@mytutorapp/shared/hooks';
import CustomGoogleLoginButton from '../components/CustomGoogleLoginButton';
import { ShopContext } from '@mytutorapp/shared/context';

const LoginPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token } = useContext(ShopContext) ?? {};

  // local state
  const [confirmPassword, setConfirmPassword] = useState('');

  const from = (location.state as any)?.from?.pathname || '/';

  const {
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
    handleRequestOTP,
    handleOTPVerification,
    handleFormSubmit,
    handleRoleSubmit,
    handleGoogleLoginSuccess,
    handleGoogleLoginFailure,
  } = useAuth({
    alertFn: msg => alert(msg),
    navigateFn: to => navigate(to, { replace: true }),
  });

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguages([e.target.value]);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentState === 'Sign Up' && password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    handleFormSubmit();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-300">
      {/* Logo */}
      <div className="mb-8">
        <Link to="/">
          <img src={assets.logo} alt="Logo" className="h-20 w-auto" />
        </Link>
      </div>

      {/* Auth Form */}
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        {forgotPassword ? (
          otpSent ? (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleOTPVerification();
              }}
              className="space-y-6"
            >
              <h2 className="heading-2xl">Enter OTP</h2>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="input"
                placeholder="Enter OTP"
                required
              />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="input"
                placeholder="New Password (min. 8 characters)"
                required
              />
              <button type="submit" className="btn">
                Reset Password
              </button>
            </form>
          ) : (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleRequestOTP();
              }}
              className="space-y-6"
            >
              <h2 className="heading-2xl">Reset Password</h2>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="Enter your email"
                required
              />
              <button type="submit" className="btn">
                Send OTP
              </button>
              <p onClick={() => setForgotPassword(false)} className="link">
                Back to Login
              </p>
            </form>
          )
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <h2 className="heading-2xl">
              {currentState === 'Login'
                ? 'Login to FunzaSasa'
                : 'Sign Up for FunzaSasa'}
            </h2>

            {/* Sign‐Up Extra Fields */}
            {currentState === 'Sign Up' && (
              <>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input"
                  placeholder="Name"
                  required
                />
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as 'student' | 'tutor')}
                  className="input"
                  required
                >
                  <option value="">Select Role</option>
                  <option value="student">Student</option>
                  <option value="tutor">Tutor</option>
                </select>
                {role === 'student' && (
                  <>
                    <input
                      type="number"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      className="input"
                      placeholder="Age"
                      required
                    />
                    <select
                      value={languages[0] || ''}
                      onChange={handleLanguageChange}
                      className="input"
                      required
                    >
                      <option value="" disabled>
                        Select Your Language
                      </option>
                      <option value="English">English</option>
                      <option value="Swahili">Swahili</option>
                      <option value="French">French</option>
                      <option value="Spanish">Spanish</option>
                      <option value="German">German</option>
                    </select>
                    <select
                      value={ageGroup}
                      onChange={e => setAgeGroup(e.target.value)}
                      className="input"
                      required
                    >
                      <option value="">Select Age Group</option>
                      <option value="Pre-Primary">Pre-Primary</option>
                      <option value="Lower Primary">Lower Primary</option>
                      <option value="Upper Primary">Upper Primary</option>
                      <option value="University/College">
                        University/College
                      </option>
                      <option value="Adults">Adults</option>
                    </select>
                  </>
                )}
              </>
            )}

            {/* Email + Password */}
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              placeholder="Email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              placeholder="Password"
              required
            />

            {/* Confirm Password in Sign Up */}
            {currentState === 'Sign Up' && (
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Confirm Password"
                required
              />
            )}

            <button type="submit" className="btn">
              {currentState === 'Login' ? 'Login' : 'Sign Up'}
            </button>

            <div className="flex justify-between text-sm mt-4">
              <p onClick={() => setForgotPassword(true)} className="link">
                Forgot password?
              </p>
              {currentState === 'Login' ? (
                <p
                  onClick={() => setCurrentState('Sign Up')}
                  className="link"
                >
                  Create account
                </p>
              ) : (
                <p
                  onClick={() => setCurrentState('Login')}
                  className="link"
                >
                  Already have an account?
                </p>
              )}
            </div>
          </form>
        )}

        {/* OR / Google */}
        <div className="my-4 text-center text-gray-500">OR</div>
        <h5 className="text-lg font-semibold text-center text-gray-300 mb-2">
          Sign in using:
        </h5>
        <CustomGoogleLoginButton
          onSuccess={handleGoogleLoginSuccess}
          onFailure={handleGoogleLoginFailure}
        />
      </div>

      {/* Role-picker modal */}
      {showRoleModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h2 className="heading-2xl mb-4">Select Your Role</h2>
            <form
              onSubmit={e => {
                e.preventDefault();
                handleRoleSubmit();
              }}
              className="space-y-4"
            >
              <select
                value={role}
                onChange={e => setRole(e.target.value as 'student' | 'tutor')}
                className="input"
                required
              >
                <option value="">Select Role</option>
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
              </select>

              {role === 'student' && (
                <>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    className="input"
                    placeholder="Age"
                    required
                  />
                  <select
                    value={languages[0] || ''}
                    onChange={handleLanguageChange}
                    className="input"
                    required
                  >
                    <option value="" disabled>
                      Select Your Language
                    </option>
                    <option value="English">English</option>
                    <option value="Swahili">Swahili</option>
                    <option value="French">French</option>
                    <option value="Spanish">Spanish</option>
                    <option value="German">German</option>
                  </select>
                  <select
                    value={ageGroup}
                    onChange={e => setAgeGroup(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Select Age Group</option>
                    <option value="Pre-Primary">Pre-Primary</option>
                    <option value="Lower Primary">Lower Primary</option>
                    <option value="Upper Primary">Upper Primary</option>
                    <option value="University/College">
                      University/College
                    </option>
                    <option value="Adults">Adults</option>
                  </select>
                </>
              )}

              <button type="submit" className="btn w-full">
                Continue
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
