import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
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
      console.log('▶️ Checking Google Play services / environment');
      await GoogleSignin.hasPlayServices();

      console.log('▶️ Signing out existing session');
      await GoogleSignin.signOut();

      console.log('▶️ Calling GoogleSignin.signIn()');
      const userInfo = await GoogleSignin.signIn();
      console.log('🟢 Google userInfo:', userInfo);

      const { idToken } = await GoogleSignin.getTokens();
      console.log('🟢 Google idToken:', idToken);

      await onSuccess({ credential: idToken });
    } catch (err: any) {
      console.error('🔴 GoogleSignin error', err);
      Alert.alert(
        'Google Sign-In Error',
        err.message ?? JSON.stringify(err),
      );
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
      <Text style={tw`text-white font-semibold`}>
        Sign in with Google
      </Text>
      {loading && <ActivityIndicator style={tw`ml-2`} color="#fff" />}
    </TouchableOpacity>
  );
};

export default CustomGoogleLoginButtonNative;
