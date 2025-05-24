import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert, Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import tw from '../../tailwind';

type GoogleButtonProps = {
  onSuccess: (idToken: string) => Promise<void>;
  onFailure: (error?: Error) => void;
};

const CustomGoogleLoginButtonNative: React.FC<GoogleButtonProps> = ({
  onSuccess,
  onFailure,
}) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Android only: ensure Google Play services
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }

      // Launch the Google Sign-In flow
      await GoogleSignin.signIn();

      // Fetch tokens (this returns the idToken)
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) {
        throw new Error('No ID token received');
      }

      // Pass the token upstream
      await onSuccess(idToken);
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);

      let message = 'Failed to sign in with Google';
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        message = 'Sign in cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        message = 'Sign in already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        message = 'Google Play services not available';
      } else if (error.message.includes('No ID token')) {
        message = 'Google authentication failed – no token';
      }

      Alert.alert('Google Sign-In Error', message);
      onFailure(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleGoogleSignIn}
      disabled={loading}
      style={[
        tw`bg-pink-500 py-3 px-4 rounded-lg flex-row items-center justify-center`,
        loading && tw`opacity-50`,
      ]}
    >
      <Text style={tw`text-white font-semibold`}>
        Sign in with Google
      </Text>
      {loading && <ActivityIndicator style={tw`ml-2`} />}
    </TouchableOpacity>
  );
};

export default CustomGoogleLoginButtonNative;
