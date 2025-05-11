import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import tw from '../../tailwind';

// Define your navigation parameter list
type RootStackParamList = {
  Home: undefined;
  // Add any additional routes you plan to navigate to
};

const CustomGoogleLoginButton: React.FC = () => {
  // Type the navigation instance using RootStackParamList
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const handleGoogleLogin = () => {
    // Your login logic here, then navigate to Home
    navigation.navigate('Home');
  };

  return (
    <TouchableOpacity
      onPress={handleGoogleLogin}
      style={tw`bg-pink-500 py-3 px-4 rounded-lg flex-row items-center justify-center`}
    >
      <Text style={tw`text-white text-center font-semibold`}>
        Sign in with Google
      </Text>
    </TouchableOpacity>
  );
};

export default CustomGoogleLoginButton;
