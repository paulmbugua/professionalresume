// apps/mobile/src/screens/LoginScreen.native.tsx

import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import tw from '../../tailwind';
import { assets } from '../../assets/assets';
import useAuth from '@mytutorapp/shared/hooks/useAuth';
import CustomGoogleLoginButtonNative from '../screens/CustomGoogleLoginButton.native';

type RootStackParamList = {
  Home: undefined;
};

const LoginPageNative: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

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
    alertFn: (msg: string) => Alert.alert('Alert', msg),
    // no navigateFn here—token flip in App.tsx handles it
  });

  const isLogin = currentState === 'Login';
  const pickLanguage = (val: string) => setLanguages([val]);

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-900`}
      contentContainerStyle={tw`flex-grow justify-center p-4 bg-gray-900`}
    >
      {/* Logo (optional) */}
      <View style={tw`items-center mb-8`}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Image
            source={assets.logo}
            style={tw`h-20 w-20`}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Forgot-Password Flow */}
      {forgotPassword ? (
        otpSent ? (
          <View style={tw`bg-gray-800 p-6 rounded-lg`}>
            <Text style={tw`text-2xl font-bold text-white mb-4`}>
              Enter OTP
            </Text>
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
            <TouchableOpacity
              onPress={handleOTPVerification}
              style={tw`bg-pink-500 py-3 rounded-lg`}
            >
              <Text style={tw`text-center text-white font-bold`}>
                Reset Password
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={tw`bg-gray-800 p-6 rounded-lg`}>
            <Text style={tw`text-2xl font-bold text-white mb-4`}>
              Reset Password
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Your Email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
            />
            <TouchableOpacity
              onPress={handleRequestOTP}
              style={tw`bg-pink-500 py-3 rounded-lg mb-4`}
            >
              <Text style={tw`text-center text-white font-bold`}>
                Send OTP
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setForgotPassword(false)}>
              <Text style={tw`text-center text-blue-400 underline`}>
                Back to Login
              </Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        /* Main Login / Sign-Up Form */
        <View style={tw`bg-gray-800 p-6 rounded-lg`}>
          <Text style={tw`text-2xl font-bold text-white mb-6`}>
            {isLogin ? 'Login to FunzaSasa' : 'Sign Up for FunzaSasa'}
          </Text>

          {isLogin ? (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
              />
              <TouchableOpacity
                onPress={handleFormSubmit}
                style={tw`bg-pink-500 py-3 rounded-lg mb-4`}
              >
                <Text style={tw`text-center text-white font-bold`}>
                  Login
                </Text>
              </TouchableOpacity>
              <View style={tw`flex-row justify-between`}>
                <TouchableOpacity onPress={() => setForgotPassword(true)}>
                  <Text style={tw`text-blue-400 underline`}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setCurrentState('Sign Up')}
                >
                  <Text style={tw`text-blue-400 underline`}>
                    Create account
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Name"
                placeholderTextColor="#9CA3AF"
                style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
              />
              <Picker
                selectedValue={role}
                onValueChange={setRole}
                style={tw`bg-gray-700 rounded text-white mb-4`}
              >
                <Picker.Item label="Select Role" value="" />
                <Picker.Item label="Student" value="student" />
                <Picker.Item label="Tutor" value="tutor" />
              </Picker>

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
                    <Picker.Item label="Swahili" value="Swahili" />
                    <Picker.Item label="French" value="French" />
                    <Picker.Item label="Spanish" value="Spanish" />
                    <Picker.Item label="German" value="German" />
                  </Picker>
                  <Picker
                    selectedValue={ageGroup}
                    onValueChange={setAgeGroup}
                    style={tw`bg-gray-700 rounded text-white mb-4`}
                  >
                    <Picker.Item label="Select Age Group" value="" />
                    <Picker.Item
                      label="Pre-Primary"
                      value="Pre-Primary"
                    />
                    <Picker.Item
                      label="Lower Primary"
                      value="Lower Primary"
                    />
                    <Picker.Item
                      label="Upper Primary"
                      value="Upper Primary"
                    />
                    <Picker.Item
                      label="University/College"
                      value="University/College"
                    />
                    <Picker.Item label="Adults" value="Adults" />
                  </Picker>
                </>
              )}

              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                style={tw`bg-gray-700 p-3 rounded text-white mb-4`}
              />
              <TouchableOpacity
                onPress={handleFormSubmit}
                style={tw`bg-pink-500 py-3 rounded-lg mb-4`}
              >
                <Text style={tw`text-center text-white font-bold`}>
                  Sign Up
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCurrentState('Login')}
              >
                <Text style={tw`text-center text-blue-400 underline`}>
                  Already have an account?
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Google Button */}
          <View style={tw`my-6`}>
            <Text style={tw`text-center text-gray-500`}>OR</Text>
            <Text
              style={tw`text-lg font-semibold text-center text-gray-300 mb-2`}
            >
              Sign in using:
            </Text>
            <CustomGoogleLoginButtonNative
              onSuccess={handleGoogleLoginSuccess}
              onFailure={handleGoogleLoginFailure}
            />
          </View>
        </View>
      )}

      {/* Role-Modal (unchanged) */}
      {showRoleModal && (
        <View
          style={tw`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50`}
        >
          {/* … */}
        </View>
      )}
    </ScrollView>
  );
};

export default LoginPageNative;
