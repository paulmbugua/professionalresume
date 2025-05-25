import React, { FC } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useShopContext } from '@mytutorapp/shared/context';
import Spinner from './Spinner.native';
import { useCertificationSettings } from '@mytutorapp/shared/hooks';
import tw from '../../tailwind';

// Define a custom interface for a file-list–like object
interface FileListLike<T> {
  length: number;
  item(index: number): T | null;
  [index: number]: T | number | ((index: number) => T | null);
}

// Helper to convert an array to a FileList-like object without using 'any'
function arrayToFileList<T>(files: T[]): FileList {
  const fileList: FileListLike<T> = {
    length: files.length,
    item(index: number): T | null {
      return files[index] || null;
    },
  };
  files.forEach((file, index) => {
    fileList[index] = file;
  });
  return (fileList as unknown) as FileList;
}

const CertificationSettingsNative: FC = () => {
  const { token, backendUrl, profile } = useShopContext();

  // Only tutors can upload certification documents
  if (!profile || profile.role?.toLowerCase() !== 'tutor') {
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
      if (!result.canceled) {
        const fileList = arrayToFileList([result]);
        handleFileChange({ target: { files: fileList } });
      }
    } catch {
      Alert.alert('Error', 'An error occurred while picking the file.');
    }
  };

  return (
    <View style={tw`w-full max-w-3xl mx-auto bg-gray-900 p-6 rounded-lg shadow-md`}>
      <Text style={tw`text-3xl font-bold text-pink-400 mb-4`}>Tutor Certification</Text>
      <Text style={tw`text-gray-400 text-sm mb-6`}>
        (Optional) Enhance your profile's credibility by submitting your qualification documents.
        You can upload multiple files (each max 5MB, PDF/JPEG/PNG). You may submit these anytime
        after profile creation.
      </Text>

      {/* Certification Documents */}
      <View style={tw`mb-6`}>
        <Text style={tw`text-gray-300 mb-2`}>Certification Documents</Text>
        <TouchableOpacity
          onPress={pickDocument}
          style={tw`w-full p-2 rounded-md bg-gray-800 border border-gray-700 mb-1`}
        >
          <Text style={tw`text-gray-200 text-center`}>Choose Certification Files</Text>
        </TouchableOpacity>
        <Text style={tw`text-gray-500 text-xs`}>
          Allowed formats: PDF, JPEG, PNG. Max size per file: 5MB.
        </Text>
      </View>

      {/* Submit or Status */}
      {(!certificationData || certificationData.status === 'Pending') ? (
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={uploading}
          style={tw`w-full py-2 px-4 bg-pink-500 rounded-md shadow`}
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
            Certification status:{' '}
            <Text style={tw`font-bold`}>{certificationData.status}</Text>
          </Text>
        </View>
      )}
    </View>
  );
};

export default CertificationSettingsNative;
