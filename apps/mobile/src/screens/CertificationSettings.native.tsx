// apps/mobile/src/screens/CertificationSettings.native.tsx

import React, { FC, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useShopContext } from '@mytutorapp/shared/context';
import Spinner from '../screens/Spinner.native';
import useCertificationSettings, {
  UploadableFile,
} from '@mytutorapp/shared/hooks/useCertificationSettings';
import tw from '../../tailwind';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const CertificationSettingsNative: FC = () => {
  const { token, backendUrl, profile } = useShopContext();
  const profileId = profile?.id;

  // Guard: only tutors
  if (!profile || profile.role !== 'tutor') {
    return (
      <View style={tw`p-6 bg-gray-900 rounded-lg`}>
        <Text style={tw`text-2xl text-pink-400`}>Tutor Certification</Text>
        <Text style={tw`text-gray-400`}>Only tutors can upload docs.</Text>
      </View>
    );
  }

  const {
    certificationData,
    uploading,
    setMobileFiles,
    handleSubmit,
  } = useCertificationSettings(backendUrl, token, profileId);

  const [assets, setAssets] = useState<DocumentPicker.DocumentPickerAsset[]>([]);

  // Pick files
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_TYPES,
        multiple: true,
      });
      if (!result.canceled && Array.isArray(result.assets)) {
        const valid = result.assets.filter((asset) => {
          if ((asset.size ?? 0) > MAX_FILE_SIZE) {
            Alert.alert('Error', `"${asset.name}" exceeds 5MB.`);
            return false;
          }
          if (!ALLOWED_TYPES.includes(asset.mimeType ?? '')) {
            Alert.alert('Error', `"${asset.name}" must be PDF, JPEG, or PNG.`);
            return false;
          }
          return true;
        });
        setAssets((prev) => [...prev, ...valid]);
        // Tell the hook about these files in its agnostic format:
        setMobileFiles(
      valid.map(a => ({
        uri: a.uri,
        name: a.name,
        type: a.mimeType!,
      }))
    );
      }
    } catch (err) {
      console.error('Picker error:', err);
      Alert.alert('Error', 'Failed to pick documents.');
    }
  };

  return (
    <View style={tw`p-6 bg-gray-900 rounded-lg`}>
      <Text style={tw`text-3xl text-pink-400 mb-4`}>Tutor Certification</Text>
      <Text style={tw`text-gray-400 mb-6`}>
        Upload qualification documents (PDF/PNG/JPEG, max 5MB each).
      </Text>

      {/* Picker */}
      <TouchableOpacity
        onPress={pickDocument}
        style={tw`bg-gray-800 p-2 rounded mb-3`}
      >
        <Text style={tw`text-white text-center`}>Choose Certification Files</Text>
      </TouchableOpacity>
      {assets.map((a, idx) => (
        <Text key={idx} style={tw`text-gray-200 mb-1`}>{a.name}</Text>
      ))}

      {/* Submit */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={uploading}
        style={tw`mt-4 bg-pink-500 p-3 rounded`}
      >
        {uploading ? <Spinner /> : <Text style={tw`text-white text-center`}>Submit Certification</Text>}
      </TouchableOpacity>

      {/* Current status */}
      {certificationData && (
        <View style={tw`mt-4 bg-green-600 p-2 rounded`}>
          <Text style={tw`text-white`}>Status: {certificationData.status}</Text>
        </View>
      )}
    </View>
  );
};

export default CertificationSettingsNative;
