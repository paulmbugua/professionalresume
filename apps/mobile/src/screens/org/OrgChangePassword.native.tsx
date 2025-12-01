// apps/mobile/src/screens/org/OrgChangePassword.native.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from '../../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import { institutionChangePassword } from '@mytutorapp/shared/api/institutionAuth';

const MUST_CHANGE_KEY = 'org:mustChangePassword';

type OrgStackParamList = {
  OrgChangePassword: {
    from?: string;
  } | undefined;
};

const OrgChangePasswordNative: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<OrgStackParamList, 'OrgChangePassword'>>();
  const { backendUrl, orgToken } = useShopContext() as any;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // If org session is gone, ask them to log in again
  if (!orgToken) {
    return (
      <View style={tw`flex-1 bg-[#0b1220] items-center justify-center px-6`}>
        <Text style={tw`text-sm text-red-400 text-center`}>
          Session expired. Please log in again.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.replace('OrgLogin')}
          style={tw`mt-3 px-4 py-2 rounded-xl bg-indigo-600`}
        >
          <Text style={tw`text-white font-semibold`}>Go to login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSubmit = async () => {
    setError(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    try {
      setBusy(true);

      // 🔐 Call backend to change the password
      await institutionChangePassword(
        backendUrl,
        orgToken,
        currentPassword,
        newPassword
      );

      // ✅ Clear the must-change flag for this session (native uses AsyncStorage)
      try {
        await AsyncStorage.removeItem(MUST_CHANGE_KEY);
      } catch {
        // ignore
      }

      setSuccess(true);

      setTimeout(() => {
        const from = route.params?.from || 'OrgElearnPortal';
        navigation.replace(from as any);
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Failed to change password');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={tw`flex-1 bg-[#0b1220] px-4 py-8 justify-center`}>
      <View
        style={tw`w-full max-w-md self-center rounded-2xl bg-white/5 border border-white/10 p-6`}
      >
        <Text style={tw`text-xl font-semibold text-center text-white mb-2`}>
          Update your password
        </Text>
        <Text
          style={tw`text-xs text-center text-white/60 mb-4`}
        >
          For security, your institution asked you to change the temporary
          password before using the portal.
        </Text>

        {error && (
          <View
            style={tw`mb-4 rounded-lg bg-red-900/60 border border-red-500/40 px-3 py-2`}
          >
            <Text style={tw`text-sm text-red-100`}>{error}</Text>
          </View>
        )}

        {success && (
          <View
            style={tw`mb-4 rounded-lg bg-emerald-900/60 border border-emerald-500/40 px-3 py-2`}
          >
            <Text style={tw`text-sm text-emerald-100`}>
              Password updated. Redirecting…
            </Text>
          </View>
        )}

        <View style={tw`gap-4`}>
          <TextInput
            secureTextEntry
            style={tw`mt-1 w-full px-3 py-2 rounded-xl bg-[#0f1821] text-white border border-white/10`}
            placeholder="Current password"
            placeholderTextColor="#9CA3AF"
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <TextInput
            secureTextEntry
            style={tw`mt-1 w-full px-3 py-2 rounded-xl bg-[#0f1821] text-white border border-white/10`}
            placeholder="New password (min. 8 characters)"
            placeholderTextColor="#9CA3AF"
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TextInput
            secureTextEntry
            style={tw`mt-1 w-full px-3 py-2 rounded-xl bg-[#0f1821] text-white border border-white/10`}
            placeholder="Confirm new password"
            placeholderTextColor="#9CA3AF"
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
          />

          <TouchableOpacity
            disabled={busy}
            onPress={handleSubmit}
            style={tw.style(
              'mt-2 inline-flex w-full items-center justify-center rounded-xl h-11 px-5 bg-indigo-600 shadow-sm',
              busy && 'opacity-60'
            )}
          >
            {busy ? (
              <View style={tw`flex-row items-center`}>
                <ActivityIndicator color="#fff" />
                <Text style={tw`ml-2 text-white font-semibold`}>
                  Updating…
                </Text>
              </View>
            ) : (
              <Text style={tw`text-white font-semibold`}>
                Change password
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OrgChangePasswordNative;
