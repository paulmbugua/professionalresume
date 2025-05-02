// ... other imports

import { ScrollView, View, Text, TextInput, TouchableOpacity, Image, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, NavigationProp } from '@react-navigation/native';

import { assets } from '../../assets/assets';
import { useAuth } from '@mytutorapp/shared/hooks';
import CustomGoogleLoginButtonNative from '../screens/CustomGoogleLoginButton.native';

type RootStackParamList = {
  Home: undefined;
  // Add additional routes as needed
};

const LoginPageNative: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const {
    currentState, // currentState is typed as 'Login' | 'Sign Up'
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
    alertFn: (msg: string) => Alert.alert('Alert', msg),
    navigateFn: (to: string) => navigation.navigate(to as keyof RootStackParamList),
  });

  // Create a helper variable to avoid early narrowing in the render
  const isLogin = currentState === 'Login';

  // Helper for single-select language update
  const handleLanguageChange = (value: string) => {
    setLanguages([value]);
  };

  return (
    <ScrollView
      contentContainerClassName="flex-1 items-center justify-center bg-gray-900 p-4"
      className="bg-gray-900"
    >
      {/* Logo */}
      <View className="mb-8">
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Image source={assets.logo} className="h-20 w-auto" resizeMode="contain" />
        </TouchableOpacity>
      </View>

      <View>
        {forgotPassword ? (
          otpSent ? (
            <View className="space-y-6">
              <Text className="text-2xl font-bold text-white mb-4">Enter OTP</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                className="bg-gray-700 p-3 rounded text-white mb-4"
                placeholder="Enter OTP"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                className="bg-gray-700 p-3 rounded text-white mb-4"
                placeholder="New Password (min. 8 characters)"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
              />
              <TouchableOpacity
                onPress={() => handleOTPVerification({} as React.FormEvent)}
                className="bg-pink-500 py-3 rounded-lg"
              >
                <Text className="text-center text-white font-bold">Reset Password</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-6">
              <Text className="text-2xl font-bold text-white mb-4">Reset Password</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                className="bg-gray-700 p-3 rounded text-white mb-4"
                placeholder="Enter your email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
              />
              <TouchableOpacity
                onPress={() => handleRequestOTP({} as React.FormEvent)}
                className="bg-pink-500 py-3 rounded-lg mb-4"
              >
                <Text className="text-center text-white font-bold">Send OTP</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setForgotPassword(false)}>
                <Text className="text-center text-blue-400 underline">Back to Login</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          <View className="space-y-6">
            <Text className="text-2xl font-bold text-white mb-4">
              {isLogin ? 'Login to FunzaSasa' : 'Sign Up for FunzaSasa'}
            </Text>
            {!isLogin && (
              <>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="bg-gray-700 p-3 rounded text-white mb-4"
                  placeholder="Name"
                  placeholderTextColor="#9CA3AF"
                />
                <Picker
                  selectedValue={role}
                  onValueChange={(itemValue) => setRole(itemValue)}
                  className="bg-gray-700 rounded text-white mb-4"
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
                      className="bg-gray-700 p-3 rounded text-white mb-4"
                      placeholder="Age"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                    />
                    <Picker
                      selectedValue={languages[0] || ''}
                      onValueChange={handleLanguageChange}
                      className="bg-gray-700 rounded text-white mb-4"
                    >
                      <Picker.Item label="Select Your Language" value="" />
                      <Picker.Item label="English" value="English" />
                      <Picker.Item label="Swahili" value="Swahili" />
                      <Picker.Item label="French" value="French" />
                      <Picker.Item label="Spanish" value="Spanish" />
                      <Picker.Item label="German" value="German" />
                    </Picker>
                    <Picker
                      selectedValue={ageGroup}
                      onValueChange={(itemValue) => setAgeGroup(itemValue)}
                      className="bg-gray-700 rounded text-white mb-4"
                    >
                      <Picker.Item label="Select Age Group" value="" />
                      <Picker.Item label="Pre-Primary" value="Pre-Primary" />
                      <Picker.Item label="Lower Primary" value="Lower Primary" />
                      <Picker.Item label="Upper Primary" value="Upper Primary" />
                      <Picker.Item label="University/College" value="University/College" />
                      <Picker.Item label="Adults" value="Adults" />
                    </Picker>
                  </>
                )}
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  className="bg-gray-700 p-3 rounded text-white mb-4"
                  placeholder="Email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  className="bg-gray-700 p-3 rounded text-white mb-4"
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                />
                <TouchableOpacity
                  onPress={() => handleFormSubmit({} as React.FormEvent)}
                  className="bg-pink-500 py-3 rounded-lg"
                >
                  <Text className="text-center text-white font-bold">
                    {isLogin ? 'Login' : 'Sign Up'}
                  </Text>
                </TouchableOpacity>
                <View className="flex-row justify-between mt-4">
                  <TouchableOpacity onPress={() => setForgotPassword(true)}>
                    <Text className="text-blue-400 underline">Forgot password?</Text>
                  </TouchableOpacity>
                  {isLogin ? (
                    <TouchableOpacity onPress={() => setCurrentState('Sign Up')}>
                      <Text className="text-blue-400 underline">Create account</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setCurrentState('Login')}>
                      <Text className="text-blue-400 underline">Already have an account?</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
            <View className="my-4">
              <Text className="text-center text-gray-500">OR</Text>
            </View>
            <Text className="text-lg font-semibold text-center text-gray-300 mb-2">
              Sign in using:
            </Text>
            <CustomGoogleLoginButtonNative />
          </View>
        )}
        <View className="my-4">
          <Text className="text-center text-gray-500">OR</Text>
        </View>
        <CustomGoogleLoginButtonNative />
      </View>
      {showRoleModal && (
        <View className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <View className="bg-gray-800 p-8 rounded-lg shadow-lg w-full">
            <View className="max-w-sm w-full mx-auto">
              <Text className="text-2xl font-bold text-white mb-4">Select Your Role</Text>
              <Picker
                selectedValue={role}
                onValueChange={(itemValue) => setRole(itemValue)}
                className="bg-gray-700 rounded text-white mb-4"
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
                    className="bg-gray-700 p-3 rounded text-white mb-4"
                    placeholder="Age"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                  <Picker
                    selectedValue={languages[0] || ''}
                    onValueChange={handleLanguageChange}
                    className="bg-gray-700 rounded text-white mb-4"
                  >
                    <Picker.Item label="Select Your Language" value="" />
                    <Picker.Item label="English" value="English" />
                    <Picker.Item label="Swahili" value="Swahili" />
                    <Picker.Item label="French" value="French" />
                    <Picker.Item label="Spanish" value="Spanish" />
                    <Picker.Item label="German" value="German" />
                  </Picker>
                  <Picker
                    selectedValue={ageGroup}
                    onValueChange={(itemValue) => setAgeGroup(itemValue)}
                    className="bg-gray-700 rounded text-white mb-4"
                  >
                    <Picker.Item label="Select Age Group" value="" />
                    <Picker.Item label="Pre-Primary" value="Pre-Primary" />
                    <Picker.Item label="Lower Primary" value="Lower Primary" />
                    <Picker.Item label="Upper Primary" value="Upper Primary" />
                    <Picker.Item label="University/College" value="University/College" />
                    <Picker.Item label="Adults" value="Adults" />
                  </Picker>
                </>
              )}
              <TouchableOpacity
                onPress={() => handleRoleSubmit({} as React.FormEvent)}
                className="bg-pink-500 py-3 rounded-lg mt-4"
              >
                <Text className="text-center text-white font-bold">Save Role</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default LoginPageNative;
