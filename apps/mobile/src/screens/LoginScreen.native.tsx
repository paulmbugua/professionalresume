import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, StackActions } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { FontAwesome } from '@expo/vector-icons';
import tw from '../../tailwind';
import { assets } from '../../assets/assets';
import useAuth from '@mytutorapp/shared/hooks/useAuth';
import CustomGoogleLoginButtonNative from '../screens/CustomGoogleLoginButton.native';
import { useShopContext } from '@mytutorapp/shared/context';

type RootStackParamList = { Home: undefined };
type LoginNavProp       = StackNavigationProp<RootStackParamList, 'Home'>;

const LoginPageNative: React.FC = () => {
  const navigation = useNavigation<LoginNavProp>();
  const { token } = useShopContext();

  // New local state:
  const [confirmPassword, setConfirmPassword]         = useState('');
  const [showPassword, setShowPassword]               = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
  } = useAuth({ alertFn: msg => Alert.alert('Alert', msg) });

  // Only navigate once we have a token AND role picked
  useEffect(() => {
    if (token && !showRoleModal && role) {
      navigation.dispatch(StackActions.replace('Home'));
    }
  }, [token, showRoleModal, role, navigation]);

  const isLogin = currentState === 'Login';
  const pickLanguage = (val: string) => setLanguages([val]);

  // Wrapper to enforce confirm-password match on SignUp
  const onSubmit = () => {
    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    handleFormSubmit();
  };

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-900`}
      contentContainerStyle={tw`flex-grow justify-center p-4 bg-gray-900`}
    >
      {/* Logo */}
      <View style={tw`items-center mb-8`}>
        <TouchableOpacity onPress={() => navigation.replace('Home')}>
          <Image source={assets.logo} style={tw`h-20 w-20`} resizeMode="contain" />
        </TouchableOpacity>
      </View>

      {forgotPassword ? (
        otpSent ? (
          // … OTP Entry (unchanged) …
          <View style={tw`bg-gray-800 p-6 rounded-lg`}>
            <Text style={tw`text-2xl font-bold text-white mb-4`}>Enter OTP</Text>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter OTP"
              placeholderTextColor="#9CA3AF"
              style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
              keyboardType="numeric"
            />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New Password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
            />
            <TouchableOpacity onPress={handleOTPVerification} style={tw`bg-pink-500 py-3 rounded-lg`}>
              <Text style={tw`text-center text-white font-bold`}>Reset Password</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // … Request OTP (unchanged) …
          <View style={tw`bg-gray-800 p-6 rounded-lg`}>
            <Text style={tw`text-2xl font-bold text-white mb-4`}>Reset Password</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Your Email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
            />
            <TouchableOpacity onPress={handleRequestOTP} style={tw`bg-pink-500 py-3 rounded-lg mb-4`}>
              <Text style={tw`text-center text-white font-bold`}>Send OTP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setForgotPassword(false)}>
              <Text style={tw`text-center text-blue-400 underline`}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        // Login / Sign Up Form
        <View style={tw`bg-gray-800 p-6 rounded-lg`}>
          <Text style={tw`text-2xl font-bold text-white mb-6`}>
            {isLogin ? 'Login to FunzaSasa' : 'Sign Up for FunzaSasa'}
          </Text>

          {isLogin ? (
            <>
              {/* Email */}
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
              />

              {/* Password + eye toggle */}
              <View style={tw`relative mb-4`}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  style={tw`bg-gray-700 p-3 rounded text-white`}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  style={tw`absolute right-4 top-3`}
                >
                  <FontAwesome
                    name={showPassword ? 'eye' : 'eye-slash'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onSubmit} style={tw`bg-pink-500 py-3 rounded-lg mb-4`}>
                <Text style={tw`text-center text-white font-bold`}>Login</Text>
              </TouchableOpacity>

              <View style={tw`flex-row justify-between`}>
                <TouchableOpacity onPress={() => setForgotPassword(true)}>
                  <Text style={tw`text-blue-400 underline`}>Forgot password?</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setCurrentState('Sign Up'); /* reset confirms */ setConfirmPassword(''); setShowPassword(false); setShowConfirmPassword(false); }}>
                  <Text style={tw`text-blue-400 underline`}>Create account</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Name */}
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor="#9CA3AF"
                style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
              />

              {/* Role Picker */}
              <Picker
                selectedValue={role}
                onValueChange={setRole}
                style={tw`bg-gray-700 rounded text-white mb-4`}
              >
                <Picker.Item label="Select Role" value="" />
                <Picker.Item label="Student" value="student" />
                <Picker.Item label="Tutor"   value="tutor"   />
              </Picker>

              {/* Student-only */}
              {role === 'student' && (
                <>
                  <TextInput
                    value={age}
                    onChangeText={setAge}
                    placeholder="Age"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
                  />
                  <Picker
                    selectedValue={languages[0] || ''}
                    onValueChange={pickLanguage}
                    style={tw`bg-gray-700 rounded text-white mb-4`}
                  >
                    <Picker.Item label="Select Language" value="" />
                    <Picker.Item label="English" value="English" />
                    {/* …other languages */}
                  </Picker>
                  <Picker
                    selectedValue={ageGroup}
                    onValueChange={setAgeGroup}
                    style={tw`bg-gray-700 rounded text-white mb-4`}
                  >
                    <Picker.Item label="Select Age Group" value="" />
                    <Picker.Item label="Pre-Primary" value="Pre-Primary" />
                    {/* …other age groups */}
                  </Picker>
                </>
              )}

              {/* Email */}
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
              />

              {/* Password */}
              <View style={tw`relative mb-4`}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  style={tw`bg-gray-700 p-3 rounded text-white`}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  style={tw`absolute right-4 top-3`}
                >
                  <FontAwesome
                    name={showPassword ? 'eye' : 'eye-slash'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <View style={tw`relative mb-4`}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirmPassword}
                  style={tw`bg-gray-700 p-3 rounded text-white`}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(v => !v)}
                  style={tw`absolute right-4 top-3`}
                >
                  <FontAwesome
                    name={showConfirmPassword ? 'eye' : 'eye-slash'}
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onSubmit} style={tw`bg-pink-500 py-3 rounded-lg mb-4`}>
                <Text style={tw`text-center text-white font-bold`}>Sign Up</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCurrentState('Login')}>
                <Text style={tw`text-center text-blue-400 underline`}>
                  Already have an account?
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Google Button */}
          <View style={tw`my-6`}>
            <Text style={tw`text-center text-gray-500`}>OR</Text>
            <Text style={tw`text-lg font-semibold text-center text-gray-300 mb-2`}>
              {isLogin ? 'Sign in using:' : 'Sign up using:'}
            </Text>
            <CustomGoogleLoginButtonNative
              onSuccess={handleGoogleLoginSuccess}
              onFailure={handleGoogleLoginFailure}
            />
          </View>
        </View>
      )}

      {/* Role-Picker Modal for Google login (unchanged) */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center p-6`}>
          <View style={tw`bg-gray-800 p-6 rounded-2xl shadow-lg`}>
            <Text style={tw`text-2xl font-bold text-white mb-4`}>
              Select Your Role
            </Text>
            <Picker
              selectedValue={role}
              onValueChange={setRole}
              style={tw`bg-gray-700 rounded mb-4 text-white`}
            >
              <Picker.Item label="Select Role…" value="" />
              <Picker.Item label="Student" value="student" />
              <Picker.Item label="Tutor"   value="tutor"   />
            </Picker>
            {role === 'student' && (
              <>
                {/* … student fields … */}
              </>
            )}
            <TouchableOpacity
              onPress={async () => {
              await handleRoleSubmit();
              navigation.dispatch(StackActions.replace('Home'));
            }}
                    style={tw`bg-pink-500 py-3 rounded-lg`}
            >
              <Text style={tw`text-center text-white font-bold`}>
                Save Role
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default LoginPageNative;
