// apps/mobile/src/screens/LoginScreen.native.tsx

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

type RootStackParamList = { Home: undefined };
type LoginNavProp       = StackNavigationProp<RootStackParamList, 'Home'>;

const LoginScreenNative: React.FC = () => {
  const navigation = useNavigation<LoginNavProp>();
  const { token } = useShopContext();

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

  // When fully authenticated & role chosen → go Home
  useEffect(() => {
    if (token && !showRoleModal && role) {
      navigation.dispatch(StackActions.replace('Home'));
    }
  }, [token, showRoleModal, role, navigation]);

  const isLogin    = currentState === 'Login';
  const pickLanguage = (val: string) => setLanguages([val]);

  const onSubmit = () => {
    if (!isLogin && password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    handleFormSubmit();
  };

  // Shared picker styling
  const pickerContainer  = tw`overflow-visible z-50 mb-4`;
  const pickerStyle      = tw`bg-gray-700 rounded`;
  const placeholderColor = '#9CA3AF';
  const selectedColor    = '#fff';
  const pickerItemStyle  = { height: 44 };

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
              placeholder="New Password"
              placeholderTextColor={placeholderColor}
              secureTextEntry
              style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
            />
            <TouchableOpacity onPress={handleOTPVerification} style={tw`bg-pink-500 py-3 rounded-lg`}>
              <Text style={tw`text-center text-white font-bold`}>Reset Password</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // === Request OTP ===
          <View style={tw`bg-gray-800 p-6 rounded-lg`}>
            <Text style={tw`text-2xl font-bold text-white mb-4`}>Reset Password</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Your Email"
              placeholderTextColor={placeholderColor}
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
        // === Login / Sign-Up Form ===
        <View style={tw`bg-gray-800 p-6 rounded-lg overflow-visible`}>
          <Text style={tw`text-2xl font-bold text-white mb-6`}>
            {isLogin ? 'Login to MyTutorApp' : 'Sign Up for MyTutorApp'}
          </Text>

          {isLogin ? (
            <>
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
                <TouchableOpacity
                  onPress={() => setShowPassword(v => !v)}
                  style={tw`absolute right-4 top-3`}
                >
                  <FontAwesome name={showPassword ? 'eye' : 'eye-slash'} size={20} color={placeholderColor}/>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onSubmit} style={tw`bg-pink-500 py-3 rounded-lg mb-4`}>
                <Text style={tw`text-center text-white font-bold`}>Login</Text>
              </TouchableOpacity>

              <View style={tw`flex-row justify-between`}>
                <TouchableOpacity onPress={() => setForgotPassword(true)}>
                  <Text style={tw`text-blue-400 underline`}>Forgot password?</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  setCurrentState('Sign Up');
                  setConfirmPassword('');
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}>
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
                placeholderTextColor={placeholderColor}
                style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
              />

              {/* Role */}
              <View style={pickerContainer}>
                <Picker
                  selectedValue={role}
                  onValueChange={setRole}
                  style={[
                    pickerStyle,
                    { color: role ? selectedColor : placeholderColor }
                  ]}
                  mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                  dropdownIconColor={selectedColor}
                  itemStyle={pickerItemStyle}
                >
                  <Picker.Item label="Select Role" value="" color={placeholderColor} />
                  <Picker.Item label="Student"     value="student" color="#000" />
                  <Picker.Item label="Tutor"       value="tutor"   color="#000" />
                </Picker>
              </View>

              {/* Student-only fields */}
              {role === 'student' && (
                <>
                  {/* Age */}
                  <TextInput
                    value={age}
                    onChangeText={setAge}
                    placeholder="Age"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numeric"
                    style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
                  />

                  {/* Language */}
                  <View style={pickerContainer}>
                    <Picker
                      selectedValue={languages[0] || ''}
                      onValueChange={pickLanguage}
                      style={[
                        pickerStyle,
                        { color: languages[0] ? selectedColor : placeholderColor }
                      ]}
                      mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                      dropdownIconColor={selectedColor}
                      itemStyle={pickerItemStyle}
                    >
                      <Picker.Item label="Select Language" value="" color={placeholderColor} />
                      <Picker.Item label="English"          value="English" color="#000" />
                      <Picker.Item label="Swahili"          value="Swahili" color="#000" />
                      <Picker.Item label="French"           value="French"  color="#000" />
                      <Picker.Item label="Spanish"          value="Spanish" color="#000" />
                      <Picker.Item label="German"           value="German"  color="#000" />
                    </Picker>
                  </View>

                  {/* Age Group */}
                  <View style={pickerContainer}>
                    <Picker
                      selectedValue={ageGroup}
                      onValueChange={setAgeGroup}
                      style={[
                        pickerStyle,
                        { color: ageGroup ? selectedColor : placeholderColor }
                      ]}
                      mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                      dropdownIconColor={selectedColor}
                      itemStyle={pickerItemStyle}
                    >
                      <Picker.Item label="Select Age Group"    value=""                   color={placeholderColor} />
                      <Picker.Item label="Pre-Primary"          value="Pre-Primary"        color="#000" />
                      <Picker.Item label="Lower Primary"        value="Lower Primary"      color="#000" />
                      <Picker.Item label="Upper Primary"        value="Upper Primary"      color="#000" />
                      <Picker.Item label="University/College"   value="University/College" color="#000" />
                      <Picker.Item label="Adults"               value="Adults"             color="#000" />
                    </Picker>
                  </View>
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

              {/* Password */}
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

              {/* Confirm Password */}
              <View style={tw`relative mb-4`}>
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm Password"
                  placeholderTextColor={placeholderColor}
                  secureTextEntry={!showConfirmPassword}
                  style={tw`bg-gray-700 p-3 rounded text-white`}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(v => !v)} style={tw`absolute right-4 top-3`}>
                  <FontAwesome name={showConfirmPassword ? 'eye' : 'eye-slash'} size={20} color={placeholderColor} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onSubmit} style={tw`bg-pink-500 py-3 rounded-lg mb-4`}>
                <Text style={tw`text-center text-white font-bold`}>Sign Up</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setCurrentState('Login')}>
                <Text style={tw`text-center text-blue-400 underline`}>Already have an account?</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Google Login */}
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

      {/* First-time Google “Role Picker” Modal */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-center p-6`}>
          <View style={tw`bg-gray-800 p-6 rounded-2xl shadow-lg overflow-visible z-50`}>
            <Text style={tw`text-2xl font-bold text-white mb-4`}>
              Select Your Role
            </Text>

            {/* Role */}
            <View style={pickerContainer}>
              <Picker
                selectedValue={role}
                onValueChange={setRole}
                style={[
                  pickerStyle,
                  { color: role ? selectedColor : placeholderColor }
                ]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
                itemStyle={pickerItemStyle}
              >
                <Picker.Item label="Select Role…" value="" color={placeholderColor} />
                <Picker.Item label="Student"     value="student" color="#000" />
                <Picker.Item label="Tutor"       value="tutor"   color="#000" />
              </Picker>
            </View>

            {/* Student-only in modal */}
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
                    style={[
                      pickerStyle,
                      { color: languages[0] ? selectedColor : placeholderColor }
                    ]}
                    mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                    dropdownIconColor={selectedColor}
                    itemStyle={pickerItemStyle}
                  >
                    <Picker.Item label="Select Language…" value="" color={placeholderColor} />
                    <Picker.Item label="English" value="English" color="#000" />
                    <Picker.Item label="Swahili" value="Swahili" color="#000" />
                    <Picker.Item label="French"  value="French"  color="#000" />
                    <Picker.Item label="Spanish" value="Spanish" color="#000" />
                    <Picker.Item label="German"  value="German"  color="#000" />
                  </Picker>
                </View>

                <View style={pickerContainer}>
                  <Picker
                    selectedValue={ageGroup}
                    onValueChange={setAgeGroup}
                    style={[
                      pickerStyle,
                      { color: ageGroup ? selectedColor : placeholderColor }
                    ]}
                    mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                    dropdownIconColor={selectedColor}
                    itemStyle={pickerItemStyle}
                  >
                    <Picker.Item label="Select Age Group…"    value=""                   color={placeholderColor} />
                    <Picker.Item label="Pre-Primary"          value="Pre-Primary"         color="#000" />
                    <Picker.Item label="Lower Primary"        value="Lower Primary"       color="#000" />
                    <Picker.Item label="Upper Primary"        value="Upper Primary"       color="#000" />
                    <Picker.Item label="University/College"   value="University/College"  color="#000" />
                    <Picker.Item label="Adults"               value="Adults"              color="#000" />
                  </Picker>
                </View>
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

export default LoginScreenNative;
