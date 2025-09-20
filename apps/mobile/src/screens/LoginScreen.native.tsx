// apps/mobile/src/screens/LoginScreen.native.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, StackActions } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { FontAwesome } from '@expo/vector-icons';
import tw from '../../tailwind';
import { assets } from '../../assets/assets';
import useAuth from '@mytutorapp/shared/hooks/useAuth';
import CustomGoogleLoginButtonNative from './CustomGoogleLoginButton.native';
import { useShopContext } from '@mytutorapp/shared/context';
import type { MainStackParamList } from '../navigation/types';

type LoginNavProp = StackNavigationProp<MainStackParamList, 'Home'>;
type AuthMode = 'Login' | 'Sign Up';
type ResetMode = 'idle' | 'requesting' | 'verifying';
type Role = '' | 'student' | 'tutor';

const LoginScreenNative: React.FC = () => {
  const navigation = useNavigation<LoginNavProp>();
  const { token, role: userRole, profile } = useShopContext();
  const myId = String(profile?.id ?? '');

  // ── Local UI state (parity with web) ──────────────────────
  const [authMode, setAuthMode] = useState<AuthMode>('Login');
  const [resetMode, setResetMode] = useState<ResetMode>('idle');
  const [otpSent, setOtpSent] = useState<boolean>(false);

  // Basic fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Sign-up & Role modal fields
  const [name, setName] = useState<string>('');
  const [role, setRole] = useState<Role>('');
  const [age, setAge] = useState<string>(''); // keep as string
  const [languages, setLanguages] = useState<string[]>([]);
  const [ageGroup, setAgeGroup] = useState<string>('');

  // OTP/reset fields
  const [otp, setOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  // UX
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Google-first role completion modal (mirrors web)
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);

  // ── Auth hook (parity with web API) ───────────────────────
  const {
    // Google
    handleGoogleLoginSuccess,
    handleGoogleLoginFailure,
    // Email/password
    loginWithEmail,
    registerWithEmail,
    sendResetOTP,
    resetPasswordWithOTP,
    // Role modal
    isRoleModalNeeded,
    completeRole,
    clearAuthFlags,
  } = useAuth({
    alertFn: (msg: string) => Alert.alert('Alert', msg),
    // accept optional destination; default to Home (parity with web’s navigateFn)
    navigateFn: (dest?: string) => {
      try {
        if (dest) {
          navigation.dispatch(StackActions.replace(dest as keyof MainStackParamList));
          return;
        }
      } catch {
        // swallow and fallback
      }
      navigation.dispatch(StackActions.replace('Home'));
    },
  });

  // Open role modal early if needed (web opens quickly too)
  useEffect(() => {
    if (isRoleModalNeeded()) {
      setShowRoleModal(true);
      // defaults for student in case they switch to student
      if (!languages.length) setLanguages(['English']);
      if (!ageGroup) setAgeGroup('Upper Primary');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When fully authenticated & role chosen → go Home (parity)
  useEffect(() => {
    if (token && userRole && !showRoleModal) {
      navigation.dispatch(StackActions.replace('Home'));
    }
  }, [token, userRole, showRoleModal, navigation]);

  // Shared picker styling
  const pickerContainer = tw`overflow-visible z-50 mb-4`;
  const pickerStyle = tw`bg-gray-700 rounded`;
  const placeholderColor = '#9CA3AF';
  const selectedColor = '#fff';
  const pickerItemStyle = { height: 44 };

  const isLogin = authMode === 'Login';
  const pickLanguage = (val: string) => setLanguages([val]);

  const clearErrors = () => setError(null);

  // ── Email login / signup submit (parity validations) ──────
  const onSubmit = async () => {
    clearErrors();
    try {
      setBusy(true);

      if (authMode === 'Login') {
        if (!email || !password) {
          setError('Please enter email and password.');
          return;
        }
        await loginWithEmail({ email: email.trim(), password });
        navigation.dispatch(StackActions.replace('Home'));
        return;
      }

      // Sign Up
      if (!name || !email || !password || !role) {
        setError('Please fill all required fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (role === 'student') {
        if (!age || !languages.length || !ageGroup) {
          setError('Students must provide age, language and age group.');
          return;
        }
      }

      await registerWithEmail({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        // student-only fields (backend ignores if role=tutor)
        age: role === 'student' ? age : undefined, // keep as string (RegisterPayload.age is string | undefined)
        languages: role === 'student' ? languages : undefined,
        ageGroup: role === 'student' ? ageGroup : undefined,
      });

      navigation.dispatch(StackActions.replace('Home'));
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Authentication failed';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  // ── Password reset flow (OTP) ─────────────────────────────
  const handleSendOtp = async () => {
    clearErrors();
    if (!email) {
      setError('Please enter your account email.');
      return;
    }
    try {
      setBusy(true);
      await sendResetOTP(email.trim());
      setOtpSent(true);
      setResetMode('verifying');
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Failed to send OTP';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    clearErrors();
    if (!email || !otp || !newPassword) {
      setError('Please fill all fields.');
      return;
    }
    try {
      setBusy(true);
      await resetPasswordWithOTP(email.trim(), otp.trim(), newPassword);
      // back to login
      setResetMode('idle');
      setOtpSent(false);
      setAuthMode('Login');
      setPassword('');
      setOtp('');
      setNewPassword('');
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Failed to reset password';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  // ── Role modal logic (parity) ─────────────────────────────
  // remove name checks from isStudentValid
const isStudent = role === 'student';
const numericAge = Number(age);

const isStudentValid =
  isStudent &&
  Number.isFinite(numericAge) &&
  numericAge > 0 &&
  Array.isArray(languages) &&
  languages.length > 0 &&
  (languages[0] || '').trim().length > 0 &&
  typeof ageGroup === 'string' &&
  ageGroup.trim().length > 0;


  const canContinue = role === 'tutor' || isStudentValid;
  const ctaText = role === 'tutor' ? 'Create account' : 'Create profile';

  const submitRoleFromModal = async () => {
  clearErrors();
  if (!role) {
    setError('Please select a role.');
    return;
  }
  try {
    setBusy(true);
    if (role === 'tutor') {
      await completeRole({ userId: myId, role: 'tutor' });
    } else if (isStudentValid) {
      await completeRole({
        userId: myId,
        role: 'student',
        age,          // string
        languages,    // string[]
        ageGroup,     // string
      });
    } else {
      setError('Please complete all required student fields.');
      return;
    }
    setShowRoleModal(false);
    navigation.dispatch(StackActions.replace('Home'));
  } catch (err: unknown) {
    const msg =
      typeof err === 'object' && err && 'message' in err
        ? String((err as { message?: string }).message)
        : 'Failed to update role';
    setError(msg);
  } finally {
    setBusy(false);
  }
};


  const handleCancelRole = async () => {
    try {
      setBusy(false);
      setShowRoleModal(false);
      clearAuthFlags();
    } finally {
      navigation.dispatch(StackActions.replace('Home'));
    }
  };

  const emailFormTitle = useMemo(
    () => (authMode === 'Login' ? 'Login to MyTutorApp' : 'Create your MyTutorApp account'),
    [authMode]
  );

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-900`}
      contentContainerStyle={tw`flex-grow justify-center p-4 bg-gray-900`}
      keyboardShouldPersistTaps="handled"
    >
      {/* Logo */}
      <View style={tw`items-center mb-8`}>
        <TouchableOpacity onPress={() => navigation.dispatch(StackActions.replace('Home'))}>
          <Image source={assets.logo} style={tw`h-20 w-20`} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {/* Error banner (parity) */}
      {error && (
        <View style={tw`mb-4 rounded-lg bg-red-700/20 px-3 py-2`}>
          <Text style={tw`text-red-300 text-sm`}>{error}</Text>
        </View>
      )}

      {/* Forms */}
      {resetMode !== 'idle' ? (
        otpSent ? (
          // === Enter OTP ===
          <View style={tw`bg-gray-800 p-6 rounded-lg`}>
            <Text style={tw`text-2xl font-bold text-white mb-4`}>Enter OTP</Text>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              placeholderTextColor={placeholderColor}
              style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
              keyboardType="numeric"
            />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password (min. 8 characters)"
              placeholderTextColor={placeholderColor}
              secureTextEntry
              style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
            />

            <View style={tw`flex-row gap-2`}>
              <TouchableOpacity
                onPress={() => {
                  setResetMode('idle');
                  setOtpSent(false);
                  setError(null);
                }}
                style={tw`flex-1 h-11 rounded-xl bg-gray-700 items-center justify-center`}
              >
                <Text style={tw`text-gray-200`}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={busy}
                style={tw`flex-1 h-11 rounded-xl bg-pink-500 items-center justify-center ${busy ? 'opacity-60' : ''}`}
              >
                <Text style={tw`text-white font-semibold`}>Reset Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // === Request OTP ===
          <View style={tw`bg-gray-800 p-6 rounded-lg`}>
            <Text style={tw`text-2xl font-bold text-white mb-4`}>Reset Password</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={placeholderColor}
              keyboardType="email-address"
              style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
            />

            <View style={tw`flex-row gap-2`}>
              <TouchableOpacity
                onPress={() => {
                  setResetMode('idle');
                  setError(null);
                }}
                style={tw`flex-1 h-11 rounded-xl bg-gray-700 items-center justify-center`}
              >
                <Text style={tw`text-gray-200`}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={busy}
                style={tw`flex-1 h-11 rounded-xl bg-pink-500 items-center justify-center ${busy ? 'opacity-60' : ''}`}
              >
                <Text style={tw`text-white font-semibold`}>Send OTP</Text>
              </TouchableOpacity>
            </View>
          </View>
        )
      ) : (
        // === Login / Sign-Up ===
        <View style={tw`bg-gray-800 p-6 rounded-lg overflow-visible`}>
          <Text style={tw`text-2xl font-bold text-white mb-6`}>{emailFormTitle}</Text>

          {authMode === 'Sign Up' && (
            <>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor={placeholderColor}
                style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
              />
              <View style={pickerContainer}>
                <Picker
                  selectedValue={role}
                  onValueChange={v => setRole(v as Role)}
                  style={[pickerStyle, { color: role ? selectedColor : placeholderColor }]}
                  mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                  dropdownIconColor={selectedColor}
                  itemStyle={pickerItemStyle}
                >
                  <Picker.Item label="Select role" value="" color={placeholderColor} />
                  <Picker.Item label="Student" value="student" color="#000" />
                  <Picker.Item label="Tutor" value="tutor" color="#000" />
                </Picker>
              </View>

              {role === 'student' && (
                <>
                  <TextInput
                    value={age}
                    onChangeText={setAge}
                    placeholder="Age"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numeric"
                    style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
                  />
                  <View style={pickerContainer}>
                    <Picker
                      selectedValue={languages[0] || ''}
                      onValueChange={pickLanguage}
                      style={[pickerStyle, { color: languages[0] ? selectedColor : placeholderColor }]}
                      mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                      dropdownIconColor={selectedColor}
                      itemStyle={pickerItemStyle}
                    >
                      <Picker.Item label="Select your language" value="" color={placeholderColor} />
                      <Picker.Item label="English" value="English" color="#000" />
                      <Picker.Item label="Swahili" value="Swahili" color="#000" />
                      <Picker.Item label="French" value="French" color="#000" />
                      <Picker.Item label="Spanish" value="Spanish" color="#000" />
                      <Picker.Item label="German" value="German" color="#000" />
                    </Picker>
                  </View>
                  <View style={pickerContainer}>
                    <Picker
                      selectedValue={ageGroup}
                      onValueChange={setAgeGroup}
                      style={[pickerStyle, { color: ageGroup ? selectedColor : placeholderColor }]}
                      mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                      dropdownIconColor={selectedColor}
                      itemStyle={pickerItemStyle}
                    >
                      <Picker.Item label="Select age group" value="" color={placeholderColor} />
                      <Picker.Item label="Pre-Primary" value="Pre-Primary" color="#000" />
                      <Picker.Item label="Lower Primary" value="Lower Primary" color="#000" />
                      <Picker.Item label="Upper Primary" value="Upper Primary" color="#000" />
                      <Picker.Item label="University/College" value="University/College" color="#000" />
                      <Picker.Item label="Adults" value="Adults" color="#000" />
                    </Picker>
                  </View>
                </>
              )}
            </>
          )}

          {/* Email */}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={placeholderColor}
            keyboardType="email-address"
            style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
          />

          {/* Password + toggle */}
          <View style={tw`relative mb-4`}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={placeholderColor}
              secureTextEntry={!showPassword}
              style={tw`bg-gray-700 p-3 rounded text-white`}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={tw`absolute right-4 top-3`}>
              <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={20} color={placeholderColor} />
            </TouchableOpacity>
          </View>

          {/* Confirm Password (Sign Up) */}
          {authMode === 'Sign Up' && (
            <View style={tw`relative mb-4`}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor={placeholderColor}
                secureTextEntry={!showConfirmPassword}
                style={tw`bg-gray-700 p-3 rounded text-white`}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} style={tw`absolute right-4 top-3`}>
                <FontAwesome name={showConfirmPassword ? 'eye' : 'eye-slash'} size={20} color={placeholderColor} />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            onPress={onSubmit}
            disabled={busy}
            style={tw`bg-pink-500 py-3 rounded-lg mb-4 ${busy ? 'opacity-60' : ''}`}
          >
            <Text style={tw`text-center text-white font-bold`}>
              {authMode === 'Login' ? 'Login' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <View style={tw`flex-row justify-between`}>
            <TouchableOpacity
              onPress={() => {
                clearErrors();
                setResetMode('requesting');
              }}
            >
              <Text style={tw`text-blue-400 underline`}>Forgot password?</Text>
            </TouchableOpacity>

            {authMode === 'Login' ? (
              <TouchableOpacity
                onPress={() => {
                  clearErrors();
                  setAuthMode('Sign Up');
                }}
              >
                <Text style={tw`text-blue-400 underline`}>Create account</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  clearErrors();
                  setAuthMode('Login');
                }}
              >
                <Text style={tw`text-blue-400 underline`}>Already have an account?</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Google Login */}
          <View style={tw`my-6`}>
            <Text style={tw`text-center text-gray-500`}>OR</Text>
            <Text style={tw`text-lg font-semibold text-center text-gray-300 mb-2`}>
              {isLogin ? 'Sign in using:' : 'Sign up using:'}
            </Text>
            <CustomGoogleLoginButtonNative
              onSuccess={async (idToken) => {
                await handleGoogleLoginSuccess(idToken);
                // if hook decides role is needed, open the modal
                if (isRoleModalNeeded()) setShowRoleModal(true);
              }}
              onFailure={handleGoogleLoginFailure}
            />
          </View>
        </View>
      )}

      {/* Role Picker Modal (Google-first) */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center p-6`}>
          <View style={tw`bg-gray-800 p-6 rounded-2xl shadow-lg overflow-visible`}>
            <Text style={tw`text-2xl font-bold text-white mb-4`}>
              {role === 'tutor' ? 'Finish creating your account' : 'Create your student profile'}
            </Text>

            {/* Error inside modal, if any */}
            {error && (
              <View style={tw`mb-4 rounded-lg bg-red-700/20 px-3 py-2`}>
                <Text style={tw`text-red-300 text-sm`}>{error}</Text>
              </View>
            )}

            {/* Role */}
            <View style={pickerContainer}>
              <Picker
                selectedValue={role}
                onValueChange={(v) => {
                  const next = v as Role;
                  setRole(next);
                  if (next === 'student') {
                    if (!languages.length) setLanguages(['English']);
                    if (!ageGroup) setAgeGroup('Upper Primary');
                    if (!name.trim()) setName('');
                  } else {
                    // tutors: no profile capture
                    setName('');
                    setAge('');
                    setLanguages([]);
                    setAgeGroup('');
                  }
                }}
                style={[pickerStyle, { color: role ? selectedColor : placeholderColor }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
                itemStyle={pickerItemStyle}
              >
                <Picker.Item label="Select role…" value="" color={placeholderColor} />
                <Picker.Item label="Student" value="student" color="#000" />
                <Picker.Item label="Tutor" value="tutor" color="#000" />
              </Picker>
            </View>

            {/* Student-only fields */}
            {role === 'student' && (
              <>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  placeholderTextColor={placeholderColor}
                  style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
                />
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  placeholder="Age"
                  placeholderTextColor={placeholderColor}
                  keyboardType="numeric"
                  style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
                />
                <View style={pickerContainer}>
                  <Picker
                    selectedValue={languages[0] || ''}
                    onValueChange={pickLanguage}
                    style={[pickerStyle, { color: languages[0] ? selectedColor : placeholderColor }]}
                    mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                    dropdownIconColor={selectedColor}
                    itemStyle={pickerItemStyle}
                  >
                    <Picker.Item label="Select your language…" value="" color={placeholderColor} />
                    <Picker.Item label="English" value="English" color="#000" />
                    <Picker.Item label="Swahili" value="Swahili" color="#000" />
                    <Picker.Item label="French" value="French" color="#000" />
                    <Picker.Item label="Spanish" value="Spanish" color="#000" />
                    <Picker.Item label="German" value="German" color="#000" />
                  </Picker>
                </View>
                <View style={pickerContainer}>
                  <Picker
                    selectedValue={ageGroup}
                    onValueChange={setAgeGroup}
                    style={[pickerStyle, { color: ageGroup ? selectedColor : placeholderColor }]}
                    mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                    dropdownIconColor={selectedColor}
                    itemStyle={pickerItemStyle}
                  >
                    <Picker.Item label="Select age group…" value="" color={placeholderColor} />
                    <Picker.Item label="Pre-Primary" value="Pre-Primary" color="#000" />
                    <Picker.Item label="Lower Primary" value="Lower Primary" color="#000" />
                    <Picker.Item label="Upper Primary" value="Upper Primary" color="#000" />
                    <Picker.Item label="University/College" value="University/College" color="#000" />
                    <Picker.Item label="Adults" value="Adults" color="#000" />
                  </Picker>
                </View>
              </>
            )}

            <View style={tw`flex-row gap-3 pt-2`}>
              <TouchableOpacity
                onPress={handleCancelRole}
                disabled={busy}
                style={tw`flex-1 h-11 rounded-xl bg-gray-700 items-center justify-center ${busy ? 'opacity-60' : ''}`}
              >
                <Text style={tw`text-gray-200`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitRoleFromModal}
                disabled={busy || !canContinue}
                style={tw`flex-1 h-11 rounded-xl bg-pink-500 items-center justify-center ${busy || !canContinue ? 'opacity-60' : ''}`}
              >
                <Text style={tw`text-white font-semibold`}>{busy ? 'Saving…' : ctaText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default LoginScreenNative;
