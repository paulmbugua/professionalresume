// /apps/web/src/pages/LoginPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { assets } from '../assets/assets';
import { useAuth } from '@shared/hooks/useAuth';

const LoginPage = () => {
  const {
    currentState, setCurrentState,
    forgotPassword, setForgotPassword,
    otpSent, email, setEmail,
    password, setPassword,
    name, setName,
    role, setRole,
    age, setAge,
    languages, setLanguages,
    ageGroup, setAgeGroup,
    newPassword, setNewPassword,
    otp, setOtp,
    showRoleModal, setShowRoleModal,
    handleGoogleLoginSuccess,
    handleGoogleLoginFailure,
    handleRequestOTP,
    handleOTPVerification,
    handleFormSubmit,
    handleRoleSubmit,
  } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-300">
      {/* Logo */}
      <div className="mb-8">
        <Link to="/">
          <img src={assets.logo} alt="Logo" className="h-20 w-auto" />
        </Link>
      </div>

      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        {forgotPassword ? (
          otpSent ? (
            // OTP Verification Form
            <form onSubmit={handleOTPVerification} className="space-y-6">
              <h2 className="text-2xl font-bold text-center text-softPink">Enter OTP</h2>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300"
                placeholder="Enter OTP"
                required
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300"
                placeholder="New Password (min. 8 characters)"
                required
              />
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-softPink text-white font-medium hover:bg-pink-700 transition duration-200"
              >
                Reset Password
              </button>
            </form>
          ) : (
            // Request OTP Form
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <h2 className="text-2xl font-bold text-center text-softPink">Reset Password</h2>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300"
                placeholder="Enter your email"
                required
              />
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-softPink text-white font-medium hover:bg-pink-700 transition duration-200"
              >
                Send OTP
              </button>
              <p
                onClick={() => setForgotPassword(false)}
                className="text-gray-400 hover:text-softPink cursor-pointer text-center"
              >
                Back to Login
              </p>
            </form>
          )
        ) : (
          // Login / Sign Up Form
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-softPink">
              {currentState === 'Login' ? 'Login to FunzaSasa' : 'Sign Up for FunzaSasa'}
            </h2>
            {currentState === 'Sign Up' && (
              <>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300"
                  placeholder="Name"
                  required
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300"
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
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300"
                      placeholder="Age"
                      required
                    />
                    <select
                      multiple
                      value={languages}
                      onChange={(e) =>
                        setLanguages(
                          Array.from(e.target.selectedOptions, (option) => option.value)
                        )
                      }
                      className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300"
                      required
                    >
                      <option value="English">English</option>
                      <option value="Swahili">Swahili</option>
                      <option value="French">French</option>
                      <option value="Spanish">Spanish</option>
                      <option value="German">German</option>
                    </select>
                    <select
                      value={ageGroup}
                      onChange={(e) => setAgeGroup(e.target.value)}
                      className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300"
                      required
                    >
                      <option value="">Select Age Group</option>
                      <option value="Pre-Primary">Pre-Primary</option>
                      <option value="Lower Primary">Lower Primary</option>
                      <option value="Upper Primary">Upper Primary</option>
                      <option value="University/College">University/College</option>
                      <option value="Adults">Adults</option>
                    </select>
                  </>
                )}
                {role === 'tutor' && (
                  <p className="text-yellow-400 text-center">
                    Tutors: Please create your profile after registration.
                  </p>
                )}
              </>
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300"
              placeholder="Email"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300"
              placeholder="Password"
              required
            />
            <button
              type="submit"
              className="w-full py-3 rounded-lg bg-softPink text-white font-medium hover:bg-pink-700 transition duration-200"
            >
              {currentState === 'Login' ? 'Login' : 'Sign Up'}
            </button>

            <div className="flex justify-between text-sm mt-4">
              <p onClick={() => setForgotPassword(true)} className="text-gray-400 hover:text-softPink cursor-pointer">
                Forgot password?
              </p>
              {currentState === 'Login' ? (
                <p onClick={() => setCurrentState('Sign Up')} className="text-gray-400 hover:text-softPink cursor-pointer">
                  Create account
                </p>
              ) : (
                <p onClick={() => setCurrentState('Login')} className="text-gray-400 hover:text-softPink cursor-pointer">
                  Already have an account?
                </p>
              )}
            </div>
          </form>
        )}

        <div className="my-4 text-center text-gray-500">OR</div>
        <h5 className="text-lg font-semibold text-center text-gray-300 mb-2">Sign in using:</h5>

        {/* Google Login Button */}
        <GoogleLogin
          onSuccess={handleGoogleLoginSuccess}
          onError={handleGoogleLoginFailure}
          render={(renderProps) => (
            <button
              onClick={renderProps.onClick}
              disabled={renderProps.disabled}
              className="w-full py-3 rounded-lg bg-pink-500 text-white font-medium hover:bg-pink-600 transition duration-200"
            >
              Sign up with Google
            </button>
          )}
        />
      </div>

      {/* Inline Role Selection Modal for Google Login users */}
      {showRoleModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-sm">
            <h2 className="text-2xl font-bold text-center text-softPink">Select Your Role</h2>
            <form onSubmit={handleRoleSubmit} className="mt-4">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300"
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
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300 mt-2"
                    placeholder="Age"
                    required
                  />
                  <select
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300 mt-2"
                    required
                  >
                    <option value="">Select Language</option>
                    <option value="English">English</option>
                    <option value="Swahili">Swahili</option>
                    <option value="French">French</option>
                    <option value="Spanish">Spanish</option>
                    <option value="German">German</option>
                  </select>
                  <select
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    className="w-full p-3 rounded-lg bg-gray-700 border border-gray-600 focus:border-softPink focus:ring-softPink text-gray-300 mt-2"
                    required
                  >
                    <option value="">Select Age Group</option>
                    <option value="Pre-Primary">Pre-Primary</option>
                    <option value="Lower Primary">Lower Primary</option>
                    <option value="Upper Primary">Upper Primary</option>
                    <option value="University/College">University/College</option>
                    <option value="Adults">Adults</option>
                  </select>
                </>
              )}
              <button
                type="submit"
                className="w-full mt-4 py-3 rounded-lg bg-softPink text-white font-medium hover:bg-pink-700 transition duration-200"
              >
                Save Role
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
