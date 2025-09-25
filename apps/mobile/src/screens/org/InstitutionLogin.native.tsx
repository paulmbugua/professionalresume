/* eslint-disable prettier/prettier */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
  type NavigationProp,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from '../../../tailwind';
import CustomGoogleLoginButtonNative from '../CustomGoogleLoginButton.native';

import useInstitutionAuth from '@mytutorapp/shared/hooks/useInstitutionAuth';
import { useShopContext } from '@mytutorapp/shared/context';
import type { MainStackParamList } from '../../navigation/types';

// ────────────────────────────────────────────────────────────────────────────
// Config
// ────────────────────────────────────────────────────────────────────────────
const LOGIN_BG =
  'https://images.unsplash.com/photo-1513258496099-48168024aec0?q=80&w=2000&auto=format&fit=crop';

type AuthMode = 'Login' | 'Sign Up';
type ResetMode = 'idle' | 'requesting' | 'verifying';

// ────────────────────────────────────────────────────────────────────────────
// Return-to handling (mirrors web logic, mapped to native routes)
// ────────────────────────────────────────────────────────────────────────────
const RETURN_TO_PRIMARY = 'auth:returnTo';
const RETURN_TO_ALIASES = [RETURN_TO_PRIMARY, 'auth:returnTo:org'];

const normalizeOrgNext = (v?: string) => {
  if (!v) return v;
  if (/^\/org\/join\/[^/]+/.test(v) || /[?&]assignmentId=/.test(v)) return v;
  return /^\/org\/?$/.test(v) ? '/org/profile' : v;
};

const computeNextFromRoute = (params?: { next?: string }) =>
  normalizeOrgNext(params?.next) || '/org/profile';

const writeReturnTo = async (v: string) => {
  try { await AsyncStorage.setItem(RETURN_TO_PRIMARY, v); } catch {}
};

const readReturnTo = async (): Promise<string> => {
  for (const k of RETURN_TO_ALIASES) {
    try {
      const v = await AsyncStorage.getItem(k);
      const n = normalizeOrgNext(v || undefined);
      if (n) return n;
    } catch {}
  }
  return '/org/profile';
};

const clearReturnTo = async () => {
  await Promise.all(RETURN_TO_ALIASES.map(k => AsyncStorage.removeItem(k)));
};

// ────────────────────────────────────────────────────────────────────────────
/** Styles */
// ────────────────────────────────────────────────────────────────────────────
const inputStyle = tw`px-4 py-3 rounded-xl border border-white/15 bg-black/30 text-white`;
const primaryBtn = tw`items-center justify-center rounded-xl h-12 px-5 bg-indigo-600`;
const ghostBtn   = tw`h-12 px-4 rounded-xl border border-white/15 items-center justify-center`;
const linkTxt    = tw`text-indigo-300 underline`;

// ────────────────────────────────────────────────────────────────────────────
/** Screen */
// ────────────────────────────────────────────────────────────────────────────
const InstitutionLoginNative: React.FC = () => {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'InstitutionLogin'>>();
  const { orgToken } = useShopContext();

  // Seed intended target (default /org/profile) on mount
  useEffect(() => {
    const seed = computeNextFromRoute(route.params);
    writeReturnTo(seed);
  }, []);

  // If already signed in as an institution, redirect to OrgProfile
  useEffect(() => {
    (async () => {
      if (orgToken) {
        await clearReturnTo();
        navigation.reset({
          index: 0,
          routes: [{ name: 'OrgProfile' as never }],
        });
      }
    })();
  }, [orgToken, navigation]);

  const {
  handleGoogleLoginSuccess,
  handleGoogleLoginFailure,
  loginWithEmail,
  registerWithEmail,
  sendResetOTP,
  resetPasswordWithOTP,
} = useInstitutionAuth({
  alertFn: (msg) => console.log('[auth]', msg),
  navigateFn: async () => {
    const _saved = await readReturnTo(); // optional: keep if you use it elsewhere
    await clearReturnTo();
    navigation.reset({
      index: 0,
      routes: [{ name: 'OrgProfile' as never }],
    });
  },
});


  // ─── Local state ────────────────────────────────────────────────────────
  const [authMode, setAuthMode] = useState<AuthMode>('Login');
  const [resetMode, setResetMode] = useState<ResetMode>('idle');
  const [otpSent, setOtpSent] = useState(false);

  const [name, setName] = useState(''); // sign-up only
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearErrors = () => setError(null);

  const emailFormTitle = useMemo(
    () => (authMode === 'Login' ? 'Institution Login' : 'Create your Institution account'),
    [authMode]
  );

  // ─── Handlers ───────────────────────────────────────────────────────────
  const onSubmit = async () => {
    clearErrors();
    try {
      setBusy(true);
      if (authMode === 'Login') {
        if (!email || !password) return setError('Please enter email and password.');
        await loginWithEmail({ email: email.trim(), password });
      } else {
        if (!name || !email || !password || !confirmPassword)
          return setError('Please fill all required fields.');
        if (password !== confirmPassword) return setError('Passwords do not match.');
        await registerWithEmail({
          name: name.trim(),
          email: email.trim(),
          password,
          role: 'tutor',
        } as any);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSendOtp = async () => {
    clearErrors();
    if (!email) return setError('Please enter your account email.');
    try {
      setBusy(true);
      await sendResetOTP(email.trim());
      setOtpSent(true);
      setResetMode('verifying');
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    clearErrors();
    if (!email || !otp || !newPassword) return setError('Please fill all fields.');
    try {
      setBusy(true);
      await resetPasswordWithOTP(email.trim(), otp.trim(), newPassword);
      setResetMode('idle');
      setOtpSent(false);
      setAuthMode('Login');
      setPassword('');
      setOtp('');
      setNewPassword('');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setBusy(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={tw`flex-1 bg-[#0d1a23]`}>
      <ImageBackground
        source={{ uri: LOGIN_BG }}
        resizeMode="cover"
        style={tw`flex-1`}
        imageStyle={{ opacity: 0.35 }}
      >
        {/* soft blobs */}
        <View style={tw`absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-400/25`} />
        <View style={tw`absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-cyan-300/20`} />

        <ScrollView
          contentContainerStyle={tw`px-5 py-12`}
          keyboardShouldPersistTaps="handled"
        >
          <View style={tw`max-w-[880px] w-full self-center`}>
            {/* Two-column feel (stacked on mobile) */}
            <View style={tw`flex-col md:flex-row`}>
              {/* Left panel – copy */}
              <View style={tw`hidden md:flex md:w-1/2`}>
                <View style={tw`w-full rounded-2xl p-6 bg-white/70 border border-white/20`}>
                  <View style={tw`flex-row items-center`}>
                    <View style={tw`h-10 w-10`}>
                      {/* brand icon (placeholder) */}
                      <View style={tw`h-10 w-10 rounded-full bg-indigo-600`} />
                    </View>
                    <Text style={tw`ml-3 text-2xl font-bold text-gray-900`}>Institution Access</Text>
                  </View>

                  <Text style={tw`mt-4 text-sm text-gray-800`}>
                    Manage branding, assignments, analytics, and reporting for your organization in one place.
                  </Text>

                  <View style={tw`mt-6`}>
                    <Text style={tw`text-sm text-gray-800`}>• Custom certificates & branding</Text>
                    <Text style={tw`text-sm text-gray-800`}>• Timed assignments & pass marks</Text>
                    <Text style={tw`text-sm text-gray-800`}>• Monthly / termly / yearly analytics</Text>
                  </View>

                  <View style={tw`mt-8 rounded-xl p-4 bg-indigo-200/30 border border-indigo-300/40`}>
                    <Text style={tw`text-sm text-gray-900`}>
                      “Rolling out courses to our cohort took minutes. The analytics saved our admin team hours.” —{' '}
                      <Text style={tw`font-semibold`}>Program Director</Text>
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => navigation.navigate('Login')}
                    style={tw`mt-8`}
                  >
                    <Text style={tw`text-sm text-indigo-700 underline`}>
                      Not an institution? Sign in as Student/Tutor
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Right panel – auth card */}
              <View style={tw`md:w-1/2 w-full`}>
                <View style={tw`w-full rounded-2xl bg-[#0f1821] border border-white/10 p-6`}>
                  {!!error && (
                    <View style={tw`mb-4 rounded-lg bg-red-950/40 border border-red-700/40 px-3 py-2`}>
                      <Text style={tw`text-red-200 text-sm`}>{error}</Text>
                    </View>
                  )}

                  {/* Forms */}
                  {resetMode !== 'idle' ? (
                    otpSent ? (
                      <View style={tw`gap-4`}>
                        <Text style={tw`text-xl font-semibold text-white text-center`}>Enter OTP</Text>
                        <TextInput
                          placeholder="Enter OTP"
                          placeholderTextColor="rgba(255,255,255,0.6)"
                          value={otp}
                          onChangeText={setOtp}
                          style={inputStyle}
                        />
                        <TextInput
                          placeholder="New Password (min. 8 characters)"
                          placeholderTextColor="rgba(255,255,255,0.6)"
                          secureTextEntry
                          value={newPassword}
                          onChangeText={setNewPassword}
                          style={inputStyle}
                        />
                        <View style={tw`flex-row gap-2`}>
                          <TouchableOpacity
                            onPress={() => { setResetMode('idle'); setOtpSent(false); setError(null); }}
                            style={ghostBtn}
                          >
                            <Text style={tw`text-white`}>Back</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleResetPassword}
                            style={[primaryBtn, tw`flex-1`, busy && tw`opacity-60`]}
                            disabled={busy}
                          >
                            <Text style={tw`text-white font-semibold`}>Reset Password</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={tw`gap-4`}>
                        <Text style={tw`text-xl font-semibold text-white text-center`}>Reset Password</Text>
                        <TextInput
                          placeholder="Enter your email"
                          placeholderTextColor="rgba(255,255,255,0.6)"
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          style={inputStyle}
                        />
                        <View style={tw`flex-row gap-2`}>
                          <TouchableOpacity
                            onPress={() => { setResetMode('idle'); setError(null); }}
                            style={ghostBtn}
                          >
                            <Text style={tw`text-white`}>Back</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleSendOtp}
                            style={[primaryBtn, tw`flex-1`, busy && tw`opacity-60`]}
                            disabled={busy}
                          >
                            <Text style={tw`text-white font-semibold`}>Send OTP</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )
                  ) : (
                    <View style={tw`gap-4`}>
                      <Text style={tw`text-xl font-semibold text-white text-center`}>{emailFormTitle}</Text>

                      {authMode === 'Sign Up' && (
                        <TextInput
                          placeholder="Full name"
                          placeholderTextColor="rgba(255,255,255,0.6)"
                          value={name}
                          onChangeText={setName}
                          style={inputStyle}
                        />
                      )}

                      <TextInput
                        placeholder="Email"
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={inputStyle}
                      />

                      <TextInput
                        placeholder="Password"
                        placeholderTextColor="rgba(255,255,255,0.6)"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                        style={inputStyle}
                      />

                      {authMode === 'Sign Up' && (
                        <TextInput
                          placeholder="Confirm password"
                          placeholderTextColor="rgba(255,255,255,0.6)"
                          secureTextEntry
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          style={inputStyle}
                        />
                      )}

                      <TouchableOpacity
                        onPress={onSubmit}
                        disabled={busy}
                        style={[primaryBtn, tw`w-full`, busy && tw`opacity-60`]}
                      >
                        <Text style={tw`text-white font-semibold`}>
                          {authMode === 'Login' ? 'Login' : 'Sign Up'}
                        </Text>
                      </TouchableOpacity>

                      <View style={tw`flex-row justify-between`}>
                        <TouchableOpacity onPress={() => { clearErrors(); setResetMode('requesting'); }}>
                          <Text style={linkTxt}>Forgot password?</Text>
                        </TouchableOpacity>

                        {authMode === 'Login' ? (
                          <TouchableOpacity onPress={() => { clearErrors(); setAuthMode('Sign Up'); }}>
                            <Text style={linkTxt}>Create account</Text>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity onPress={() => { clearErrors(); setAuthMode('Login'); }}>
                            <Text style={linkTxt}>Already have an account?</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Divider + Google */}
                  <View style={tw`my-6 flex-row items-center`}>
                    <View style={tw`flex-1 h-px bg-white/10`} />
                    <Text style={tw`mx-3 text-white/60 text-[10px]`}>OR</Text>
                    <View style={tw`flex-1 h-px bg-white/10`} />
                  </View>

                  <View style={tw`items-center`}>
                    <CustomGoogleLoginButtonNative
                      onSuccess={async (idToken: string) => {
                        try {
                          await handleGoogleLoginSuccess(idToken, name || undefined);
                        } catch (e: any) {
                          Alert.alert('Google sign-in failed', e?.message || 'Please try again.');
                        }
                        // No manual navigation here; navigateFn runs post-token.
                      }}
                      onFailure={(err?: Error) => handleGoogleLoginFailure(err)}
                    />
                  </View>

                  {/* Mobile helper link */}
                  <View style={tw`mt-6 items-center`}>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                      <Text style={tw`text-sm text-white`}>
                        Not an institution? <Text style={tw`underline text-indigo-300`}>Sign in as Student/Tutor</Text>
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={tw`mt-6 text-center text-[10px] text-white/70`}>
                    By continuing, you agree to our{' '}
                    <Text style={tw`underline`} onPress={() => Linking.openURL('https://yourapp.com/terms')}>
                      Terms
                    </Text>{' '}
                    and{' '}
                    <Text style={tw`underline`} onPress={() => Linking.openURL('https://yourapp.com/privacy-policy')}>
                      Privacy Policy
                    </Text>
                    .
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
};

export default InstitutionLoginNative;
