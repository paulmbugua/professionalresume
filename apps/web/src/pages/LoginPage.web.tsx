import { Link } from 'react-router-dom';
import { assets } from "../assets/assets";
import { useAuth } from '@shared/hooks';
import CustomGoogleLoginButton from '../components/CustomGoogleLoginButton';

const LoginPage = () => {
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
  } = useAuth({
    alertFn: (msg) => alert(msg),
    navigateFn: (to) => (window.location.href = to),
  });

  // Helper function for single select language update
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguages([e.target.value]);
  };

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
            <form onSubmit={handleOTPVerification} className="space-y-6">
              <h2 className="heading-2xl">Enter OTP</h2>
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
              <button type="submit" className="btn">Reset Password</button>
            </form>
          ) : (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <h2 className="heading-2xl">Reset Password</h2>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="Enter your email"
                required
              />
              <button type="submit" className="btn">Send OTP</button>
              <p onClick={() => setForgotPassword(false)} className="link">Back to Login</p>
            </form>
          )
        ) : (
          <form onSubmit={handleFormSubmit} className="space-y-6">
            <h2 className="heading-2xl">
              {currentState === 'Login' ? 'Login to FunzaSasa' : 'Sign Up for FunzaSasa'}
            </h2>
            {currentState === 'Sign Up' && (
              <>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Name"
                  required
                />
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as 'student' | 'tutor')
                  }
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
                      onChange={(e) => setAge(e.target.value)}
                      className="input"
                      placeholder="Age"
                      required
                    />
                    <select
                      value={languages[0] || ""}
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
                      onChange={(e) => setAgeGroup(e.target.value)}
                      className="input"
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
            <button type="submit" className="btn">
              {currentState === 'Login' ? 'Login' : 'Sign Up'}
            </button>
            <div className="flex justify-between text-sm mt-4">
              <p onClick={() => setForgotPassword(true)} className="link">
                Forgot password?
              </p>
              {currentState === 'Login' ? (
                <p onClick={() => setCurrentState('Sign Up')} className="link">
                  Create account
                </p>
              ) : (
                <p onClick={() => setCurrentState('Login')} className="link">
                  Already have an account?
                </p>
              )}
            </div>
          </form>
        )}

        <div className="my-4 text-center text-gray-500">OR</div>
        <h5 className="text-lg font-semibold text-center text-gray-300 mb-2">
          Sign in using:
        </h5>

        {/* Replace the default GoogleLogin with your custom button */}
        <CustomGoogleLoginButton />
      </div>

      {showRoleModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-sm">
            <h2 className="heading-2xl">Select Your Role</h2>
            <form onSubmit={handleRoleSubmit} className="mt-4">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'student' | 'tutor')}
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
                    onChange={(e) => setAge(e.target.value)}
                    className="input mt-2"
                    placeholder="Age"
                    required
                  />
                  <select
                    value={languages[0] || ""}
                    onChange={handleLanguageChange}
                    className="input mt-2"
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
                    onChange={(e) => setAgeGroup(e.target.value)}
                    className="input mt-2"
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
              <button type="submit" className="btn mt-4">Save Role</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
