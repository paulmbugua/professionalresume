import React, { useState, useEffect, Fragment } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '@mytutorapp/shared/hooks';
import tw from '../../tailwind';
import type { MainStackParamList } from '../navigation/types';

type Props = {
  /** Optional custom label for the trigger button (matches web’s `label`) */
  label?: string;
  /** Optional: override the trigger button container style (RN style object) */
  buttonStyle?: StyleProp<ViewStyle>;
  /** Optional: override the trigger button text style (RN style object) */
  textStyle?: StyleProp<TextStyle>;
};

/**
 * Inline delete-account trigger + modal.
 * - Renders a small button that fits in any row (e.g., Profile's "Logout + Delete" section).
 * - Opens a confirm modal; uses shared `useAuth` hook to perform deletion and navigate.
 */
const DeleteAccount: React.FC<Props> = ({ label = 'Delete Account', buttonStyle, textStyle }) => {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();

  // Allow the hook’s loose string destinations but keep our app safe:
  const navigateLoose = (name: string) => {
    try {
      (navigation as unknown as { navigate: (n: string) => void }).navigate(name);
    } catch {
      navigation.navigate('Home');
    }
  };

  const { handleDeleteAccount, isDeleting, deleteError } = useAuth({
    alertFn: (msg: string) => Alert.alert('', msg),
    navigateFn: (destination?: string) => {
      if (destination && destination.trim().length > 0) navigateLoose(destination);
      else navigation.navigate('Home');
    },
  });

  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (deleteError?.message) {
      Alert.alert('Error', deleteError.message);
    }
  }, [deleteError]);

  return (
    <Fragment>
      {/* Inline trigger button (fits next to "Log out") */}
      <TouchableOpacity
        onPress={() => setModalOpen(true)}
        disabled={isDeleting}
        style={[
          tw`h-9 px-3 rounded-lg items-center justify-center bg-red-600 ${isDeleting ? 'opacity-60' : ''} flex-row`,
          buttonStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <FontAwesome name="trash" size={16} color="#fff" />
        <Text style={[tw`text-white font-semibold ml-2 text-sm`, textStyle]}>{label}</Text>
      </TouchableOpacity>

      {/* Confirmation modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={tw`flex-1 bg-black/40 justify-center items-center px-4`}>
          <View style={tw`w-11/12 max-w-lg bg-[#0f1821] rounded-2xl p-6 border border-white/10`}>
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
                  setModalOpen(false); // hook handles navigation afterwards
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
    </Fragment>
  );
};

export default DeleteAccount;
