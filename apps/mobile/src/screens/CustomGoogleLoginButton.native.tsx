import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import tw from '../../tailwind';

type GoogleButtonProps = {
  onSuccess: (response: { credential: string }) => Promise<void>;
  onFailure: () => void;
};

const CustomGoogleLoginButtonNative: React.FC<GoogleButtonProps> = ({
  onSuccess,
  onFailure,
}) => {
  const [loading, setLoading] = useState(false);

  const {
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  } = (Constants.expoConfig as any).extra as {
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: string;
  };

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, [EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID]);

  const onPressGoogle = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      // Delegate to parent via props
      await onSuccess({ credential: idToken });
    } catch (err) {
      console.error('Google Signin error', err);
      onFailure();
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={onPressGoogle}
      disabled={loading}
      style={[
        tw`bg-pink-500 py-3 px-4 rounded-lg flex-row items-center justify-center`,
        loading && tw`opacity-50`,
      ]}
    >
      <Text style={tw`text-white font-semibold`}>Sign in with Google</Text>
      {loading && <ActivityIndicator style={tw`ml-2`} color="#fff" />}
    </TouchableOpacity>
  );
};

export default CustomGoogleLoginButtonNative;