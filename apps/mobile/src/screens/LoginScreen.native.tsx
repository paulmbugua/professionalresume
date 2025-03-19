// apps/mobile/src/screens/LoginScreen.native.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Modal, ScrollView } from 'react-native';
import { useAuth } from '@shared/hooks/useAuth';
import { useSafeNavigate } from '@shared/utils/navigation';
import tw from 'twrnc';
import { Alert } from 'react-native';

const LoginScreen = () => {
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
    handleRequestOTP,
    handleOTPVerification,
    handleFormSubmit,
    handleRoleSubmit,
    handleGoogleLogin, // Combined handler for both web and mobile
  } = useAuth();

  const navigate = useSafeNavigate();

  return (
    <ScrollView contentContainerStyle={tw`flex-1 justify-center items-center bg-gray-900 p-4`}>
      {/* Logo */}
      <Image source={require('../../assets/logo.png')} style={tw`h-20 w-auto mb-8`} />
      <View style={tw`bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md`}>
        {forgotPassword ? (
          otpSent ? (
            // OTP Verification Form
            <View>
              <Text style={tw`text-2xl font-bold text-center text-pink-300 mb-4`}>Enter OTP</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter OTP"
                style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
              />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New Password (min. 8 characters)"
                secureTextEntry
                style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
              />
              <TouchableOpacity 
                onPress={() => handleOTPVerification()} 
                style={tw`w-full py-3 rounded-lg bg-pink-300`}
              >
                <Text style={tw`text-center text-white`}>Reset Password</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Request OTP Form
            <View>
              <Text style={tw`text-2xl font-bold text-center text-pink-300 mb-4`}>Reset Password</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
                keyboardType="email-address"
              />
              <TouchableOpacity 
                onPress={() => handleRequestOTP()} 
                style={tw`w-full py-3 rounded-lg bg-pink-300`}
              >
                <Text style={tw`text-center text-white`}>Send OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setForgotPassword(false)}>
                <Text style={tw`text-center text-gray-400 mt-4`}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          // Login / Sign Up Form
          <View>
            <Text style={tw`text-2xl font-bold text-center text-pink-300 mb-4`}>
              {currentState === 'Login' ? 'Login to FunzaSasa' : 'Sign Up for FunzaSasa'}
            </Text>
            {currentState === 'Sign Up' && (
              <>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Name"
                  style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
                />
                <TextInput
                  value={role}
                  onChangeText={setRole}
                  placeholder="Role (student/tutor)"
                  style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
                />
                {role === 'student' && (
                  <>
                    <TextInput
                      value={age}
                      onChangeText={setAge}
                      placeholder="Age"
                      style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
                      keyboardType="numeric"
                    />
                    <TextInput
                      value={languages.toString()}
                      onChangeText={(text) => setLanguages(text.split(','))}
                      placeholder="Languages (comma separated)"
                      style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
                    />
                    <TextInput
                      value={ageGroup}
                      onChangeText={setAgeGroup}
                      placeholder="Age Group"
                      style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
                    />
                  </>
                )}
                {role === 'tutor' && (
                  <Text style={tw`text-yellow-400 text-center mb-4`}>
                    Tutors: Please create your profile after registration.
                  </Text>
                )}
              </>
            )}
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
              keyboardType="email-address"
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
            />
            <TouchableOpacity
              onPress={() => {
                Alert.alert("Button Pressed", "You clicked the Login button");
                handleFormSubmit();
              }}
              style={tw`w-full py-3 rounded-lg bg-pink-300`}
            >
              <Text style={tw`text-center text-white`}>
                {currentState === 'Login' ? 'Login' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
            <View style={tw`flex-row justify-between mt-4`}>
              <TouchableOpacity onPress={() => setForgotPassword(true)}>
                <Text style={tw`text-gray-400`}>Forgot password?</Text>
              </TouchableOpacity>
              {currentState === 'Login' ? (
                <TouchableOpacity onPress={() => setCurrentState('Sign Up')}>
                  <Text style={tw`text-gray-400`}>Create account</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setCurrentState('Login')}>
                  <Text style={tw`text-gray-400`}>Already have an account?</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        <View style={tw`my-4`}>
          <Text style={tw`text-center text-gray-500`}>OR</Text>
        </View>
        <Text style={tw`text-lg font-semibold text-center text-gray-300 mb-2`}>Sign in using:</Text>
        <TouchableOpacity
          onPress={() => {
            console.log("🔘 Google Sign-In Button Pressed"); // Debug Log
            handleGoogleLogin();
          }}
          style={tw`w-full py-3 rounded-lg bg-pink-500`}
        >
          <Text style={tw`text-center text-white`}>Sign in with Google</Text>
        </TouchableOpacity>

      </View>
      {showRoleModal && (
        <Modal visible={showRoleModal} transparent animationType="slide">
          <View style={tw`flex-1 justify-center items-center bg-black bg-opacity-50`}>
            <View style={tw`bg-gray-800 p-8 rounded-lg w-full max-w-sm`}>
              <Text style={tw`text-2xl font-bold text-center text-pink-300 mb-4`}>Select Your Role</Text>
              <TextInput
                value={role}
                onChangeText={setRole}
                placeholder="Role (student/tutor)"
                style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
              />
              {role === 'student' && (
                <>
                  <TextInput
                    value={age}
                    onChangeText={setAge}
                    placeholder="Age"
                    style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
                    keyboardType="numeric"
                  />
                  <TextInput
                    value={languages.toString()}
                    onChangeText={(text) => setLanguages(text.split(','))}
                    placeholder="Language"
                    style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
                  />
                  <TextInput
                    value={ageGroup}
                    onChangeText={setAgeGroup}
                    placeholder="Age Group"
                    style={tw`w-full p-3 rounded-lg bg-gray-700 border border-gray-600 text-gray-300 mb-4`}
                  />
                </>
              )}
              <TouchableOpacity
                onPress={() => handleRoleSubmit()}
                style={tw`w-full py-3 rounded-lg bg-pink-300`}
              >
                <Text style={tw`text-center text-white`}>Save Role</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

export default LoginScreen;
