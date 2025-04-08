import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useShopContext } from '@shared/context';
import Spinner from './Spinner.native';
import { useCertificationSettings } from '@shared/hooks';
import tw from 'twrnc';

// Helper to convert an array to a FileList-like object
function arrayToFileList<T>(files: T[]): FileList {
  const fileList: any = {
    length: files.length,
    item: (index: number) => files[index] || null,
  };
  files.forEach((file, index) => {
    fileList[index] = file;
  });
  return fileList as FileList;
}

const CertificationSettingsNative = () => {
  const { token, backendUrl, profile } = useShopContext();

  // Only tutors can upload certification documents
  if (!profile || !profile.role || profile.role.toLowerCase() !== 'tutor') {
    return (
      <View style={tw`w-full max-w-3xl mx-auto bg-gray-900 p-6 rounded-lg shadow-md`}>
        <Text style={tw`text-3xl font-bold text-pink-400 mb-4`}>Tutor Certification</Text>
        <Text style={tw`text-gray-400 text-sm`}>
          Certification upload is available only for tutors.
        </Text>
      </View>
    );
  }

  const { uploading, certificationData, handleFileChange, handleSubmit } =
    useCertificationSettings(backendUrl, token, profile.id);

  if (uploading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Spinner />
      </View>
    );
  }

  // Function to trigger document picker for certification files
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
      });
      // Check using "canceled" (with one 'l') instead of "cancelled"
      if (!result.canceled) {
        // Convert the resulting array into a FileList-like object
        const fileList = arrayToFileList([result]);
        // Call the file change handler with a synthetic event object
        handleFileChange({ target: { files: fileList } });
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while picking the file.');
    }
  };

  return (
    <View style={tw`w-full max-w-3xl mx-auto bg-gray-900 p-6 rounded-lg shadow-md`}>
      <Text style={tw`text-3xl font-bold text-pink-400 mb-4`}>Tutor Certification</Text>
      <Text style={tw`text-gray-400 mb-6 text-sm`}>
        (Optional) Enhance your profile's credibility by submitting your qualification documents.
        You can upload multiple files (each max 5MB, PDF/JPEG/PNG). You may submit these anytime after profile creation.
      </Text>
      <View style={tw`space-y-4`}>
        <View>
          <Text style={tw`text-gray-300 mb-2`}>Certification Documents</Text>
          <TouchableOpacity
            style={tw`w-full p-2 rounded-md bg-gray-800 border border-gray-700`}
            onPress={pickDocument}
          >
            <Text style={tw`text-gray-200 text-center`}>Choose Certification Files</Text>
          </TouchableOpacity>
          <Text style={tw`text-gray-500 text-xs mt-1`}>
            Allowed formats: PDF, JPEG, PNG. Maximum file size per file: 5MB.
          </Text>
        </View>
        {(!certificationData || certificationData.status === 'Pending') ? (
          <TouchableOpacity
            disabled={uploading}
            style={tw`w-full py-2 px-4 bg-pink-500 rounded-md shadow`}
            onPress={handleSubmit}
          >
            <Text style={tw`text-white font-medium text-center`}>
              {uploading
                ? 'Uploading...'
                : certificationData
                ? 'Update Certification'
                : 'Submit Certification'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={tw`mt-6 p-4 bg-green-600 rounded-md`}>
            <Text style={tw`text-white text-sm`}>
              Certification status: <Text style={tw`font-bold`}>{certificationData.status}</Text>
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default CertificationSettingsNative;
