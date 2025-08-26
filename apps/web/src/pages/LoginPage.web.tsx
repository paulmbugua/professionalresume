// apps/web/src/pages/LoginPage.web.tsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { assets } from '../assets/assets';
import { useAuth } from '@mytutorapp/shared/hooks';
import CustomGoogleLoginButton from '../components/CustomGoogleLoginButton';
import { useShopContext } from '@mytutorapp/shared/context';

const LOGIN_BG =
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=2000&auto=format&fit=crop'; // education-y desk/books

const LoginPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as any)?.from?.pathname || '/home';

  // include profile so we can check if a role exists
  const { token, role: userRole } = useShopContext();
  const hasRole = Boolean(userRole);

  const [confirmPassword, setConfirmPassword] = useState('');

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
    alertFn: (msg) => alert(msg),
    // Only navigate after we know the user already has a role.
    // If it's a brand-new Google user (no role yet), stay on this page so the role modal can open.
    navigateFn: (to) => navigate(to || from, { replace: true }),
  });

  // Redirect guard: only redirect once token exists AND role already exists AND the role modal is not showing.
  
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

  // Primary button style shared with "Explore Tutors"
  const primaryBtn =
    'inline-flex items-center justify-center rounded-xl h-11 px-5 bg-primary text-white font-semibold shadow-sm hover:shadow transition active:translate-y-[1px]';

  return (
    <div className="relative min-h-screen overflow-hidden text-darkText dark:text-darkTextPrimary">
      {/* Background image with SAME style as HomePage hero */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(rgba(16,26,35,0.35), rgba(16,26,35,0.65)), url("${LOGIN_BG}")`,
        }}
      />

      {/* Decorative blobs (subtle) */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl dark:bg-secondary/25" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-softPink/20 blur-3xl" />

      {/* Content */}
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
          {/* Brand / Benefits panel */}
          <aside className="hidden md:flex md:col-span-6">
            <div className="w-full rounded-2xl p-8 lg:p-10 bg-white/70 ring-1 ring-gray-200 shadow-sm backdrop-blur-sm dark:bg-[#0f1821]/70 dark:ring-darkCard">
              <div className="flex items-center gap-3">
                <span className="h-10 w-10 text-primary dark:text-darkTextPrimary">
                  <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true" className="h-full w-full">
                    <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" />
                  </svg>
                </span>
                <h1 className="text-2xl font-display font-bold">Welcome back</h1>
              </div>

              <p className="mt-4 max-w-prose text-mutedGray dark:text-darkTextSecondary">
                Sign in to continue learning with top-rated tutors. Personalized sessions, flexible schedules,
                and real results—right at your fingertips.
              </p>

              <ul className="mt-6 space-y-4">
                {[
                  'Live, interactive lessons with experts',
                  'Tailored recommendations across subjects',
                  'Secure payments and transparent pricing',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary font-bold">✓</span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/20 p-4 ring-1 ring-primary/20 dark:ring-secondary/30">
                <p className="text-sm">
                  “I improved my grades within weeks. The sessions are fun and super effective!” —{' '}
                  <span className="font-semibold">Aisha, Student</span>
                </p>
              </div>

              <div className="mt-8">
                <Link to="/find-tutor" className={primaryBtn}>
                  Explore Tutors
                </Link>
              </div>
            </div>
          </aside>

          {/* Auth Card */}
          <section className="md:col-span-6 flex">
            <div className="w-full rounded-2xl bg-white ring-1 ring-gray-200 shadow-sm p-6 sm:p-8 lg:p-10 backdrop-blur-sm dark:bg-[#0f1821] dark:ring-darkCard">
              {/* Logo (mobile) */}
              <div className="mb-6 flex justify-center md:hidden">
                <Link to="/" className="flex items-center justify-center">
                  <span className="h-12 w-12 text-primary dark:text-darkTextPrimary">
                    <svg viewBox="0 0 48 48" fill="currentColor" aria-hidden="true" className="h-full w-full">
                      <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" />
                    </svg>
                  </span>
                </Link>
              </div>

              {/* Forms */}
              {forgotPassword ? (
                otpSent ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleOTPVerification();
                    }}
                    className="space-y-5"
                  >
                    <h2 className="text-xl font-display font-semibold text-center">Enter OTP</h2>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="input"
                      placeholder="Enter OTP"
                      required
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input"
                      placeholder="New Password (min. 8 characters)"
                      required
                    />
                    <button type="submit" className={`${primaryBtn} w-full`}>Reset Password</button>
                  </form>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRequestOTP();
                    }}
                    className="space-y-5"
                  >
                    <h2 className="text-xl font-display font-semibold text-center">Reset Password</h2>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input"
                      placeholder="Enter your email"
                      required
                    />
                    <button type="submit" className={`${primaryBtn} w-full`}>Send OTP</button>
                    <p onClick={() => setForgotPassword(false)} className="link text-center">
                      Back to Login
                    </p>
                  </form>
                )
              ) : (
                <form onSubmit={onSubmit} className="space-y-5">
                  <h2 className="text-xl font-display font-semibold text-center">
                    {currentState === 'Login' ? 'Login to Tutorfy' : 'Create your Tutorfy account'}
                  </h2>

                  {currentState === 'Sign Up' && (
                    <>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input"
                        placeholder="Full name"
                        required
                      />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'student' | 'tutor')}
                        className="input"
                        required
                      >
                        <option value="">Select role</option>
                        <option value="student">Student</option>
                        <option value="tutor">Tutor</option>
                      </select>

                      {role === 'student' && (
                        <>
                          <input
                            type="number"
                            value={age}
                            onChange={(e) => setAge(e.target.value)}
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
                            <option value="" disabled>Select your language</option>
                            <option value="English">English</option>
                            <option value="Swahili">Swahili</option>
                            <option value="French">French</option>
                            <option value="Spanish">Spanish</option>
                            <option value="German">German</option>
                          </select>
                          <select
                            value={ageGroup}
                            onChange={(e) => setAgeGroup(e.target.value)}
                            className="input"
                            required
                          >
                            <option value="">Select age group</option>
                            <option value="Pre-Primary">Pre-Primary</option>
                            <option value="Lower Primary">Lower Primary</option>
                            <option value="Upper Primary">Upper Primary</option>
                            <option value="University/College">University/College</option>
                            <option value="Adults">Adults</option>
                          </select>
                        </>
                      )}
                    </>
                  )}

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="Email"
                    required
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="Password"
                    required
                  />

                  {currentState === 'Sign Up' && (
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input"
                      placeholder="Confirm password"
                      required
                    />
                  )}

                  <button type="submit" className={`${primaryBtn} w-full`}>
                    {currentState === 'Login' ? 'Login' : 'Sign Up'}
                  </button>

                  <div className="flex justify-between text-sm">
                    <button type="button" onClick={() => setForgotPassword(true)} className="link">
                      Forgot password?
                    </button>
                    {currentState === 'Login' ? (
                      <button type="button" onClick={() => setCurrentState('Sign Up')} className="link">
                        Create account
                      </button>
                    ) : (
                      <button type="button" onClick={() => setCurrentState('Login')} className="link">
                        Already have an account?
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* Divider / Google */}
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200 dark:bg-darkCard" />
                <span className="text-xs text-mutedGray dark:text-darkTextSecondary">OR</span>
                <div className="h-px flex-1 bg-gray-200 dark:bg-darkCard" />
              </div>
              <div className="flex justify-center">
                <CustomGoogleLoginButton
                  onSuccess={handleGoogleLoginSuccess}
                  onFailure={handleGoogleLoginFailure}
                />
              </div>

              {/* Subtle bottom help */}
              <p className="mt-6 text-center text-xs text-mutedGray dark:text-darkTextSecondary">
                By continuing, you agree to our{' '}
                <Link to="/terms" className="underline hover:text-primary">Terms</Link> and{' '}
                <Link to="/privacy-policy" className="underline hover:text-primary">Privacy Policy</Link>.
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Role Modal */}
      {showRoleModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 className="text-xl font-display font-semibold text-center mb-4">Select Your Role</h2>

            <form
              onSubmit={(e) => {
                console.log('[ui/role-modal] submit pressed');
                e.preventDefault();           // important: prevent page nav
                handleRoleSubmit();           // calls the hook (which already logs)
              }}
              className="space-y-4"
            >
              <select
                value={role}
                onChange={(e) => {
                  const next = e.target.value as 'student' | 'tutor';
                  console.log('[ui/role-modal] role changed', { next });
                  setRole(next);
                  if (next === 'student') {
                    console.log('[ui/role-modal] prefill student defaults');
                    setLanguages((prev) => (prev?.length ? prev : ['English']));
                    setAgeGroup((prev) => prev || 'Upper Primary');
                  }
                }}
                className="input"
                required
              >
                <option value="">Select role</option>
                <option value="student">Student</option>
                <option value="tutor">Tutor</option>
              </select>

              {role === 'student' && (
                <>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => {
                      console.log('[ui/role-modal] age changed', { value: e.target.value });
                      setAge(e.target.value);
                    }}
                    className="input"
                    placeholder="Age"
                    required
                  />
                  <select
                    value={languages[0] || ''}
                    onChange={(e) => {
                      console.log('[ui/role-modal] language changed', { value: e.target.value });
                      setLanguages([e.target.value]);
                    }}
                    className="input"
                    required
                  >
                    <option value="" disabled>Select your language</option>
                    <option value="English">English</option>
                    <option value="Swahili">Swahili</option>
                    <option value="French">French</option>
                    <option value="Spanish">Spanish</option>
                    <option value="German">German</option>
                  </select>
                  <select
                    value={ageGroup}
                    onChange={(e) => {
                      console.log('[ui/role-modal] ageGroup changed', { value: e.target.value });
                      setAgeGroup(e.target.value);
                    }}
                    className="input"
                    required
                  >
                    <option value="">Select age group</option>
                    <option value="Pre-Primary">Pre-Primary</option>
                    <option value="Lower Primary">Lower Primary</option>
                    <option value="Upper Primary">Upper Primary</option>
                    <option value="University/College">University/College</option>
                    <option value="Adults">Adults</option>
                  </select>
                </>
              )}

              <button type="submit" className={`${primaryBtn} w-full`}>
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
