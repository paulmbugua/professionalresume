// apps/mobile/src/screens/DeleteAccount.native.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from '@mytutorapp/shared/hooks';
import tw from '../../tailwind';

const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation();
  const { handleDeleteAccount, isDeleting, deleteError } = useAuth({
    alertFn: (msg: string) => Alert.alert('', msg),
    navigateFn: (dest: string) => navigation.navigate(dest as never),
  });

  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (deleteError) {
      Alert.alert('Error', deleteError.message);
    }
  }, [deleteError]);

  return (
    <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
      <TouchableOpacity
        style={tw`flex-row items-center bg-red-600 px-6 py-3 rounded-full shadow-lg`}
        onPress={() => setModalVisible(true)}
      >
        <FontAwesome name="trash" size={20} color="white" />
        <Text style={tw`text-white text-base font-semibold ml-3`}>
          Delete My Account
        </Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-60 justify-center p-6`}>
          <View style={tw`bg-gray-800 rounded-2xl overflow-hidden`}>
            {/* Header */}
            <View style={tw`flex-row items-center px-6 py-4`}>
              <FontAwesome name="exclamation-triangle" size={22} color="#FBBF24" />
              <Text style={tw`flex-1 text-xl font-bold text-gray-100 mx-3`}>
                Delete Account?
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome name="times" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <ScrollView style={tw`px-6 pb-4 max-h-60`}>
              <Text style={tw`text-gray-300 text-sm leading-relaxed mb-3`}>
                Deleting your account will permanently remove all your personal
                data and cannot be undone. Please review what will happen:
              </Text>
              <View style={tw`pl-4 space-y-2`}>
                <Text style={tw`text-gray-300 text-sm`}>
                  • <Text style={tw`font-semibold text-gray-200`}>Data Removal:</Text> Your profile, history, messages, and settings will be erased.
                </Text>
                <Text style={tw`text-gray-300 text-sm`}>
                  • <Text style={tw`font-semibold text-gray-200`}>Purchases & Tokens:</Text> Any purchased content or tokens will be lost.
                </Text>
                <Text style={tw`text-gray-300 text-sm`}>
                  • <Text style={tw`font-semibold text-gray-200`}>Irreversible:</Text> All data is permanently deleted.
                </Text>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={tw`flex-row justify-end px-6 py-4 space-x-4`}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                disabled={isDeleting}
                style={tw`px-4 py-2 bg-gray-700 rounded-lg`}
              >
                <Text style={tw`text-gray-300 text-base`}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  await handleDeleteAccount();
                }}
                disabled={isDeleting}
                style={tw`px-5 py-2 bg-red-600 rounded-lg flex-row items-center`}
              >
                {isDeleting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={tw`text-white text-base font-semibold`}>
                    Yes, Delete
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default DeleteAccountScreen;
