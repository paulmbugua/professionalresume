import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';

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
    <TouchableOpacity onPress={handleGoogleLogin}>
      <Text>Sign in with Google</Text>
    </TouchableOpacity>
  );
};

export default CustomGoogleLoginButton;
