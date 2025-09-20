// apps/mobile/src/screens/DeleteAccount.native.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '@mytutorapp/shared/hooks';
import tw from '../../tailwind';
import type { MainStackParamList } from '../navigation/types';

type Props = {
  /** Optional custom label for the trigger button (matches web’s `label`) */
  label?: string;
};

const DeleteAccountScreen: React.FC<Props> = ({ label = 'Delete Account' }) => {
  // Keep the navigator strongly typed
  const navigation = useNavigation<StackNavigationProp<MainStackParamList>>();

  // Helper: allow loose string route names coming from the hook, but sandbox the cast here only.
  const navigateLoose = (name: string) => {
    try {
      // This mirrors the untyped web callback; we accept a string and try to go there.
      // If it doesn't exist or type-checks fail at runtime, we catch and fall back.
      (navigation as unknown as { navigate: (n: string) => void }).navigate(name);
    } catch {
      navigation.navigate('Home');
    }
  };

  const { handleDeleteAccount, isDeleting, deleteError } = useAuth({
    alertFn: (msg: string) => Alert.alert('', msg),
    // The hook passes a plain string; we route it through the loose bridge above.
    navigateFn: (destination?: string) => {
      if (destination && destination.trim().length > 0) {
        navigateLoose(destination);
      } else {
        navigation.navigate('Home');
      }
    },
  });

  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (deleteError?.message) {
      Alert.alert('Error', deleteError.message);
    }
  }, [deleteError]);

  return (
    <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
      <TouchableOpacity
        onPress={() => setModalOpen(true)}
        disabled={isDeleting}
        style={tw`flex-row items-center bg-red-600 px-6 py-3 rounded-full shadow-lg ${isDeleting ? 'opacity-60' : ''}`}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <FontAwesome name="trash" size={20} color="white" />
        <Text style={tw`text-white text-base font-semibold ml-3`}>{label}</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-40 justify-center items-center px-4`}>
          <View style={tw`w-11/12 max-w-lg bg-gray-800 rounded-2xl p-6`}>
            {/* Header */}
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <Text style={tw`text-2xl font-semibold text-white`}>Delete Account?</Text>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                disabled={isDeleting}
                accessibilityRole="button"
                accessibilityLabel="Close delete dialog"
              >
                <FontAwesome name="times" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView style={tw`max-h-60`} contentContainerStyle={tw`pb-2`}>
              <Text style={tw`text-gray-300 text-sm leading-relaxed mb-3`}>
                Deleting your account will permanently remove all your personal data and cannot be undone.
                Please review what will happen:
              </Text>
              <View style={tw`pl-1`}>
                <Text style={tw`text-gray-300 text-sm mb-2`}>
                  • <Text style={tw`font-semibold text-gray-200`}>Data Removal:</Text> Your profile, history, messages, and settings will be erased.
                </Text>
                <Text style={tw`text-gray-300 text-sm mb-2`}>
                  • <Text style={tw`font-semibold text-gray-200`}>Purchases & Tokens:</Text> Any purchased content or tokens will be lost.
                </Text>
                <Text style={tw`text-gray-300 text-sm`}>
                  • <Text style={tw`font-semibold text-gray-200`}>Irreversible:</Text> All data is permanently deleted.
                </Text>
              </View>
            </ScrollView>

            {/* Footer actions */}
            <View style={tw`flex-row justify-end mt-6`}>
              <TouchableOpacity
                onPress={() => setModalOpen(false)}
                disabled={isDeleting}
                style={tw`px-4 py-2 rounded-md bg-gray-700 mr-3 ${isDeleting ? 'opacity-60' : ''}`}
              >
                <Text style={tw`text-gray-200`}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  await handleDeleteAccount();
                  setModalOpen(false); // close regardless; hook handles navigation
                }}
                disabled={isDeleting}
                style={tw`px-4 py-2 rounded-md bg-red-600 ${isDeleting ? 'opacity-60' : ''}`}
              >
                <Text style={tw`text-white font-semibold`}>
                  {isDeleting ? 'Deleting…' : 'Yes, Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DeleteAccountScreen;
