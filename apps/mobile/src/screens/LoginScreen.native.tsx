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
  useColorScheme,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  useNavigation,
  StackActions,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { FontAwesome } from '@expo/vector-icons';
import tw from '../../tailwind';
import { assets } from '../../assets/assets';
import useAuth from '@mytutorapp/shared/hooks/useAuth';
import CustomGoogleLoginButtonNative from './CustomGoogleLoginButton.native';
import { useShopContext } from '@mytutorapp/shared/context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainStackParamList } from '../navigation/types';
import { COUNTRIES } from '@mytutorapp/shared/utils/countries';

// 🔹 parity with web (Cancel role flow)
import { signOut } from 'firebase/auth';
import { auth } from '@mytutorapp/shared/utils/firebaseConfig';

type LoginNavProp = StackNavigationProp<MainStackParamList>;
type LoginRoute = RouteProp<MainStackParamList, 'Login'>;

type AuthMode = 'Login' | 'Sign Up';
type ResetMode = 'idle' | 'requesting' | 'verifying';
type Role = '' | 'student' | 'tutor';

const LoginScreenNative: React.FC = () => {
  const navigation = useNavigation<LoginNavProp>();
  const route = useRoute<LoginRoute>();
  const { token, role: userRole, logout } = useShopContext() as any;
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 16);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // 🚦 Switching flag (from InstitutionLogin link)
  const switching =
    route?.params?.switch === true || route?.params?.force === true;

  // ── Local UI state ────────────────────────────────────────
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
  const [country, setCountry] = useState<string>(''); // students only

  // OTP/reset fields
  const [otp, setOtp] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  // UX
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // Google-first role completion modal
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);

  // ── Theme-aware field colors (consistent with inputs) ─────
  const placeholderColor =
    (tw.color(isDark ? 'slate-400' : 'text-slate-500') as string) ||
    (isDark ? '#94A3B8' : '#9CA3AF');
  const selectedTextColor =
    (tw.color(isDark ? 'white' : 'text-slate-900') as string) ||
    (isDark ? '#FFFFFF' : '#0F172A');
  const itemTextColor = selectedTextColor; // for non-placeholder Picker.Item
  const dropdownIconColor =
    (tw.color(isDark ? 'white' : 'text-slate-700') as string) ||
    (isDark ? '#FFFFFF' : '#374151');

  // Wrap pickers in a styled container to match TextInputs
  // Taller shell + centered content prevents text clipping on Android
  const PICKER_MIN_HEIGHT = 52; // 52–56 looks great across devices
  const pickerShell: ViewStyle = {
    ...(tw`rounded-xl border border-[#cedbe8] dark:border-white/10 bg-slate-100 dark:bg-[#0b1016] mb-4` as any),
    paddingHorizontal: 12,      // px-3
    paddingVertical: 6,         // py-1.5
    minHeight: PICKER_MIN_HEIGHT,
    justifyContent: 'center',
    // Give room for the dropdown chevron so text never looks "cut"
    paddingRight: Platform.OS === 'android' ? 28 : 12,
  };

  // NOTE: On Android, Picker ignores most text styles; height matters.
  const pickerBaseStyle: any = Platform.select({
    android: { height: PICKER_MIN_HEIGHT },  // enforce enough height
    ios: { height: PICKER_MIN_HEIGHT },
  });

  const pickerItemStyle: TextStyle = Platform.select({
    ios: { height: 44 }, // affects the wheel on iOS
    android: {},         // ignored on Android
  }) as TextStyle;

    // style wrapper to control stacking on Android/iOS
    const pickerContainerStyle: StyleProp<ViewStyle> = [
      tw`overflow-visible z-50`,
      Platform.OS === 'android' ? { elevation: 6 } : { zIndex: 50 },
    ];

  // ── Auth hook ─────────────────────────────────────────────
  const {
    handleGoogleLoginSuccess,
    handleGoogleLoginFailure,
    loginWithEmail,
    registerWithEmail,
    sendResetOTP,
    resetPasswordWithOTP,
    isRoleModalNeeded,
    completeRole,
    clearAuthFlags,
  } = useAuth({
    alertFn: (msg: string) => Alert.alert('Alert', msg),
    navigateFn: (dest?: string) => {
      try {
        if (dest) {
          navigation.dispatch(
            StackActions.replace(dest as keyof MainStackParamList)
          );
          return;
        }
      } catch {
        /* ignore */
      }
      navigation.dispatch(StackActions.replace('Home'));
    },
  });

  // Fast open role modal if needed (Google) + prefill name/language for student parity with web
  useEffect(() => {
    if (isRoleModalNeeded()) {
      setShowRoleModal(true);
      if (!languages.length) setLanguages(['English']); // default language
      const gName = auth?.currentUser?.displayName || '';
      if (gName && !name) setName(gName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If already authenticated and someone opens /login, bounce home — EXCEPT when switching
  useEffect(() => {
    if (token && userRole && !showRoleModal && !switching) {
      navigation.dispatch(StackActions.replace('Home'));
    }
  }, [token, userRole, showRoleModal, navigation, switching]);

  const isLogin = authMode === 'Login';
  const clearErrors = () => setError(null);

  // ── Email login / signup submit ───────────────────────────
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
      const needsCountry = role === 'student';
      if (!name || !email || !password || !role || (needsCountry && !country)) {
        setError('Please fill all required fields.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (role === 'student') {
        const nAge = Number(age);
        if (!Number.isFinite(nAge) || nAge <= 0) {
          setError('Please enter a valid age.');
          return;
        }
        if (!languages.length || !(languages[0] || '').trim()) {
          setError('Please select your language.');
          return;
        }
      }

      await registerWithEmail({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        country: role === 'student' ? country : (undefined as any),
        age: role === 'student' ? Number(age) : (undefined as any),
        languages: role === 'student' ? languages : (undefined as any),
      });

      navigation.dispatch(StackActions.replace('Home'));
    } catch (err) {
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
    } catch (err) {
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
      setResetMode('idle');
      setOtpSent(false);
      setAuthMode('Login');
      setPassword('');
      setOtp('');
      setNewPassword('');
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Failed to reset password';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  // ── Role modal logic (Google-first) ───────────────────────
  const isStudent = role === 'student';
  const trimmedName = (name || '').trim();
 const numericAge = Number(age);
  const isStudentValid =
    isStudent &&
    trimmedName.length >= 2 &&
    trimmedName.length <= 80 &&
    Number.isFinite(numericAge) &&
    numericAge > 0 &&
    Array.isArray(languages) &&
    languages.length > 0 &&
    (languages[0] || '').trim().length > 0 &&
    country !== '';

  const canContinue = role === 'tutor' ? true : isStudentValid;
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
        await completeRole({ role: 'tutor' } as any);
      } else if (isStudentValid) {
        await completeRole({
          role: 'student',
          name: trimmedName,
          age: numericAge,
          languages,
          country,
        } as any);
      } else {
        setError('Please complete all required student fields.');
        return;
      }
      setShowRoleModal(false);
      navigation.dispatch(StackActions.replace('Home'));
    } catch (err) {
      const msg =
        typeof err === 'object' && err && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Failed to update role';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  // Cancel role modal: clear pending auth + fully sign out (parity with web)
  const handleCancelRole = async () => {
    try {
      setBusy(false);
      setShowRoleModal(false);
      clearAuthFlags();
      await signOut(auth);
    } catch {
      // ignore
    } finally {
      // Stay on Login screen
    }
  };

  // Normalize countries that might be {code,name}, {value,label}, or [code,name]
const normCountry = (c: any) => {
  const code = c?.code ?? c?.value ?? c?.[0] ?? '';
  const name = c?.name ?? c?.label ?? c?.[1] ?? '';
  return { code: String(code), name: String(name) };
};


  const handleSwitchSignOut = async () => {
    try { await logout?.(); } catch {}
    try { await signOut(auth); } catch {}
  };

  const emailFormTitle = useMemo(
    () => (authMode === 'Login' ? 'Login to DayBreak' : 'Create your DayBreak account'),
    [authMode]
  );

  // Helper: render language items once
  const renderLanguageItems = () => (
    <>
      <Picker.Item label="Select your language" value="" color={placeholderColor} />
      {['English', 'Swahili', 'French', 'Spanish', 'German'].map((lang) => (
        <Picker.Item key={lang} label={lang} value={lang} color={itemTextColor} />
      ))}
    </>
  );

  // Helper: render country items once
  const renderCountryItems = () => (
    <>
      <Picker.Item label="Select your country" value="" color={placeholderColor} />
      {COUNTRIES.map((c) => (
        <Picker.Item key={c.code} label={c.name} value={c.code} color={itemTextColor} />
      ))}
    </>
  );

  // ⬇️ UI
  return (
    <ScrollView
      style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}
      contentContainerStyle={[tw`flex-grow justify-center`, { paddingHorizontal: 16, paddingBottom: bottomPad }]}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* width-constrained center wrapper */}
      <View style={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
        {/* Logo */}
        <View style={tw`items-center mb-8`}>
          <TouchableOpacity onPress={() => navigation.dispatch(StackActions.replace('Home'))}>
            <Image source={assets.logo} style={tw`h-14 w-14`} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {/* Error banner */}
        {error && (
          <View style={tw`mb-4 rounded-xl bg-red-600/10 px-3 py-2 border border-red-600/30`}>
            <Text style={tw`text-red-400 text-sm`}>{error}</Text>
          </View>
        )}

        {/* Switch account notice (when arriving with ?switch=1 from org login) */}
        {switching && token && (
          <View style={tw`mb-4 rounded-xl bg-amber-500/10 px-3 py-2 border border-amber-500/30`}>
            <Text style={tw`text-amber-300 text-xs`}>
              You’re currently signed in. Continue to switch account or{' '}
              <Text onPress={handleSwitchSignOut} style={tw`underline`}>
                sign out
              </Text>
              .
            </Text>
          </View>
        )}

        {/* Forms */}
        {resetMode !== 'idle' ? (
          otpSent ? (
            // === Enter OTP ===
            <View style={tw`bg-white dark:bg-[#0f1821] p-6 rounded-2xl border border-[#cedbe8] dark:border-white/10`}>
              <Text style={tw`text-2xl font-bold text-[#0d141c] dark:text-white mb-4`}>Enter OTP</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter OTP"
                placeholderTextColor={placeholderColor}
                style={tw`bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 px-3 py-3 rounded-xl text-[#0d141c] dark:text-white mb-4`}
                keyboardType="numeric"
              />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New Password (min. 8 characters)"
                placeholderTextColor={placeholderColor}
                secureTextEntry
                style={tw`bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 px-3 py-3 rounded-xl text-[#0d141c] dark:text-white mb-4`}
              />

              <View style={tw`flex-row gap-2`}>
                <TouchableOpacity
                  onPress={() => {
                    setResetMode('idle');
                    setOtpSent(false);
                    setError(null);
                  }}
                  style={tw`flex-1 h-11 rounded-xl bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 items-center justify-center`}
                >
                  <Text style={tw`text-[#0d141c] dark:text-white`}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={busy}
                  style={tw`flex-1 h-11 rounded-xl bg-pink-600 items-center justify-center ${busy ? 'opacity-60' : ''}`}
                >
                  <Text style={tw`text-white font-semibold`}>Reset Password</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // === Request OTP ===
            <View style={tw`bg-white dark:bg-[#0f1821] p-6 rounded-2xl border border-[#cedbe8] dark:border-white/10`}>
              <Text style={tw`text-2xl font-bold text-[#0d141c] dark:text-white mb-4`}>Reset Password</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={placeholderColor}
                keyboardType="email-address"
                style={tw`bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 px-3 py-3 rounded-xl text-[#0d141c] dark:text-white mb-4`}
              />

              <View style={tw`flex-row gap-2`}>
                <TouchableOpacity
                  onPress={() => {
                    setResetMode('idle');
                    setError(null);
                  }}
                  style={tw`flex-1 h-11 rounded-xl bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 items-center justify-center`}
                >
                  <Text style={tw`text-[#0d141c] dark:text-white`}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={busy}
                  style={tw`flex-1 h-11 rounded-xl bg-pink-600 items-center justify-center ${busy ? 'opacity-60' : ''}`}
                >
                  <Text style={tw`text-white font-semibold`}>Send OTP</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : (
          // === Login / Sign-Up ===
          <View
            style={tw`bg-white dark:bg-[#0f1821] p-6 rounded-2xl border border-[#cedbe8] dark:border-white/10 overflow-visible`}
          >
            <Text style={tw`text-2xl font-bold text-[#0d141c] dark:text-white mb-6`}>{emailFormTitle}</Text>

            {authMode === 'Sign Up' && (
              <>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  placeholderTextColor={placeholderColor}
                  style={tw`bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 px-3 py-3 rounded-xl text-[#0d141c] dark:text-white mb-4`}
                />

                {/* Role */}
                <View style={pickerContainerStyle}>
                  <View style={pickerShell}>
                    <Picker
                      selectedValue={role}
                      onValueChange={(v) => {
                        const next = (v as Role) || '';
                        setRole(next);
                        if (next === 'student') {
                          if (!languages.length) setLanguages(['English']);
                        } else {
                          setName('');
                          setAge('');
                          setLanguages([]);
                          setCountry('');
                        }
                      }}
                      style={[pickerBaseStyle, { color: role ? selectedTextColor : placeholderColor } as any]}
                      mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                       prompt="Select role"
                      dropdownIconColor={dropdownIconColor}
                      itemStyle={pickerItemStyle}
                    >
                      <Picker.Item label="Select role" value="" color={placeholderColor} />
                      <Picker.Item label="Student" value="student" color={itemTextColor} />
                      <Picker.Item label="Tutor" value="tutor" color={itemTextColor} />
                    </Picker>
                  </View>
                </View>

                {role === 'student' && (
                  <>
                    <TextInput
                      value={age}
                      onChangeText={setAge}
                      placeholder="Age"
                      placeholderTextColor={placeholderColor}
                      keyboardType="numeric"
                      style={tw`bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 px-3 py-3 rounded-xl text-[#0d141c] dark:text-white mb-4`}
                    />

                    {/* Language */}
                    <View style={pickerContainerStyle}>
                      <View style={pickerShell}>
                        <Picker
                        selectedValue={languages?.[0] ?? ''}                // never undefined
                        onValueChange={(val) => setLanguages(val ? [String(val)] : [])}
                        style={[pickerBaseStyle, { color: languages?.[0] ? selectedTextColor : placeholderColor } as any]}
                        mode={Platform.OS === 'android' ? 'dropdown' : 'dropdown'}
                        prompt="Select your language"
                        dropdownIconColor={dropdownIconColor}
                        itemStyle={pickerItemStyle}
                      >
                        <Picker.Item label="Select your language" value="" color={placeholderColor} />
                        {['English', 'Swahili', 'French', 'Spanish', 'German'].map((lang) => (
                          <Picker.Item key={lang} label={lang} value={lang} color={itemTextColor} />
                        ))}
                      </Picker>

                      </View>
                    </View>

                    {/* Country */}
                    <View style={pickerContainerStyle}>
                      <View style={pickerShell}>
                        <Picker
                          selectedValue={country ?? ''}                        // never undefined
                          onValueChange={(v) => setCountry(String(v ?? ''))}   // always a string
                          style={[pickerBaseStyle, { color: country ? selectedTextColor : placeholderColor } as any]}
                          mode={Platform.OS === 'android' ? 'dropdown' : 'dropdown'}
                          prompt="Select your country"
                          dropdownIconColor={dropdownIconColor}
                          itemStyle={pickerItemStyle}
                        >
                          <Picker.Item label="Select your country" value="" color={placeholderColor} />
                          {COUNTRIES.map((c) => {
                            const { code, name } = normCountry(c);
                            return (
                              <Picker.Item
                                key={code || name}
                                label={name || '—'}
                                value={code || name}
                                color={itemTextColor}
                              />
                            );
                          })}
                        </Picker>
                      </View>
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
              autoCapitalize="none"
              style={tw`bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 px-3 py-3 rounded-xl text-[#0d141c] dark:text-white mb-4`}
            />

            {/* Password + toggle */}
            <View style={tw`relative mb-4`}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={placeholderColor}
                secureTextEntry={!showPassword}
                style={tw`bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 px-3 py-3 rounded-xl text-[#0d141c] dark:text-white`}
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={tw`absolute right-4 top-3`}>
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
                  style={tw`bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 px-3 py-3 rounded-xl text-[#0d141c] dark:text-white`}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword((v) => !v)} style={tw`absolute right-4 top-3`}>
                  <FontAwesome name={showConfirmPassword ? 'eye' : 'eye-slash'} size={20} color={placeholderColor} />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              onPress={onSubmit}
              disabled={busy}
              style={tw`bg-pink-600 py-3 rounded-xl mb-4 ${busy ? 'opacity-60' : ''}`}
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
                <Text style={tw`text-pink-600 dark:text-pink-400 underline`}>Forgot password?</Text>
              </TouchableOpacity>

              {authMode === 'Login' ? (
                <TouchableOpacity
                  onPress={() => {
                    clearErrors();
                    setAuthMode('Sign Up');
                  }}
                >
                  <Text style={tw`text-pink-600 dark:text-pink-400 underline`}>Create account</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    clearErrors();
                    setAuthMode('Login');
                  }}
                >
                  <Text style={tw`text-pink-600 dark:text-pink-400 underline`}>Already have an account?</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Google Login */}
            <View style={tw`my-6`}>
              <Text style={tw`text-center text-slate-600 dark:text-slate-400`}>OR</Text>
              <Text style={tw`text-lg font-semibold text-center text-[#0d141c] dark:text-white mb-2`}>
                {isLogin ? 'Sign in using:' : 'Sign up using:'}
              </Text>
              <CustomGoogleLoginButtonNative
                onSuccess={async (idToken) => {
                  await handleGoogleLoginSuccess(idToken);
                  if (isRoleModalNeeded()) {
                    if (!languages.length) setLanguages(['English']);
                    const gName = auth?.currentUser?.displayName || '';
                    if (gName && !name) setName(gName);
                    setShowRoleModal(true);
                  }
                }}
                onFailure={handleGoogleLoginFailure}
              />
            </View>
          </View>
        )}
      </View>

      {/* Role Picker Modal (Google-first) */}
      <Modal visible={showRoleModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={tw`flex-1 bg-black/40 justify-center p-6`}>
          <View
            style={tw`bg-white dark:bg-[#0f1821] p-6 rounded-2xl border border-[#cedbe8] dark:border-white/10 overflow-visible`}
          >
            <Text style={tw`text-2xl font-bold text-[#0d141c] dark:text-white mb-4`}>
              {role === 'tutor' ? 'Finish creating your account' : 'Create your student profile'}
            </Text>

            {error && (
              <View style={tw`mb-4 rounded-xl bg-red-600/10 px-3 py-2 border border-red-600/30`}>
                <Text style={tw`text-red-400 text-sm`}>{error}</Text>
              </View>
            )}

            {/* Role (modal) */}
            <View style={pickerContainerStyle}>
              <View style={pickerShell}>
                <Picker
                  selectedValue={role}
                  onValueChange={(v) => {
                    const next = (v as Role) || '';
                    setRole(next);
                    if (next === 'student') {
                      if (!languages.length) setLanguages(['English']);
                      if (!name.trim() && auth?.currentUser?.displayName) {
                        setName(auth.currentUser.displayName);
                      }
                    } else {
                      setName('');
                      setAge('');
                      setLanguages([]);
                      setCountry('');
                    }
                  }}
                  style={[pickerBaseStyle, { color: role ? selectedTextColor : placeholderColor } as any]}
                  mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                  dropdownIconColor={dropdownIconColor}
                  itemStyle={pickerItemStyle}
                >
                  <Picker.Item label="Select role…" value="" color={placeholderColor} />
                  <Picker.Item label="Student" value="student" color={itemTextColor} />
                  <Picker.Item label="Tutor" value="tutor" color={itemTextColor} />
                </Picker>
              </View>
            </View>

            {/* Student-only fields in modal */}
            {role === 'student' && (
              <>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  placeholderTextColor={placeholderColor}
                  style={tw`bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 px-3 py-3 rounded-xl text-[#0d141c] dark:text-white mb-4`}
                />
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  placeholder="Age"
                  placeholderTextColor={placeholderColor}
                  keyboardType="numeric"
                  style={tw`bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 px-3 py-3 rounded-xl text-[#0d141c] dark:text-white mb-4`}
                />

                {/* Language */}
                <View style={pickerContainerStyle}>
                  <View style={pickerShell}>
                    <Picker
                      selectedValue={languages[0] || ''}
                      onValueChange={(val) => setLanguages(val ? [val as string] : [])}
                      style={[pickerBaseStyle, { color: languages[0] ? selectedTextColor : placeholderColor } as any]}
                      mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                      dropdownIconColor={dropdownIconColor}
                      itemStyle={pickerItemStyle}
                    >
                      <Picker.Item label="Select your language…" value="" color={placeholderColor} />
                      {['English', 'Swahili', 'French', 'Spanish', 'German'].map((lang) => (
                        <Picker.Item key={lang} label={lang} value={lang} color={itemTextColor} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Country */}
                <View style={pickerContainerStyle}>
                  <View style={pickerShell}>
                    <Picker
                      selectedValue={country}
                      onValueChange={(v) => setCountry((v as string) || '')}
                      style={[pickerBaseStyle, { color: country ? selectedTextColor : placeholderColor } as any]}
                      mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                      dropdownIconColor={dropdownIconColor}
                      itemStyle={pickerItemStyle}
                    >
                      <Picker.Item label="Select your country…" value="" color={placeholderColor} />
                      {COUNTRIES.map((c) => (
                        <Picker.Item key={c.code} label={c.name} value={c.code} color={itemTextColor} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </>
            )}

            <View style={tw`flex-row gap-3 pt-2`}>
              <TouchableOpacity
                onPress={handleCancelRole}
                disabled={busy}
                style={tw`flex-1 h-11 rounded-xl bg-slate-100 dark:bg-[#0b1016] border border-[#cedbe8] dark:border-white/10 items-center justify-center ${busy ? 'opacity-60' : ''}`}
              >
                <Text style={tw`text-[#0d141c] dark:text-white`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitRoleFromModal}
                disabled={busy || !canContinue}
                style={tw`flex-1 h-11 rounded-xl bg-pink-600 items-center justify-center ${busy || !canContinue ? 'opacity-60' : ''}`}
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
