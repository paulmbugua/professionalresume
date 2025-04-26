import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useShopContext } from '@mytutorapp/shared/context';
import Spinner from './Spinner.native';
import { useCertificationSettings } from '@mytutorapp/shared/hooks';

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
  return fileList as unknown as FileList;
}

const CertificationSettingsNative = () => {
  const { token, backendUrl, profile } = useShopContext();

  // Only tutors can upload certification documents
  if (!profile || !profile.role || profile.role.toLowerCase() !== 'tutor') {
    return (
      <View className="w-full max-w-3xl mx-auto bg-gray-900 p-6 rounded-lg shadow-md">
        <Text className="text-3xl font-bold text-pink-400 mb-4">Tutor Certification</Text>
        <Text className="text-gray-400 text-sm">
          Certification upload is available only for tutors.
        </Text>
      </View>
    );
  }

  const { uploading, certificationData, handleFileChange, handleSubmit } = useCertificationSettings(
    backendUrl,
    token,
    profile.id,
  );

  if (uploading) {
    return (
      <View className="flex-1 justify-center items-center">
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
    <View className="w-full max-w-3xl mx-auto bg-gray-900 p-6 rounded-lg shadow-md">
      <Text className="text-3xl font-bold text-pink-400 mb-4">Tutor Certification</Text>
      <Text className="text-gray-400 mb-6 text-sm">
        (Optional) Enhance your profile's credibility by submitting your qualification documents.
        You can upload multiple files (each max 5MB, PDF/JPEG/PNG). You may submit these anytime
        after profile creation.
      </Text>
      <View className="space-y-4">
        <View>
          <Text className="text-gray-300 mb-2">Certification Documents</Text>
          <TouchableOpacity
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700"
            onPress={pickDocument}
          >
            <Text className="text-gray-200 text-center">Choose Certification Files</Text>
          </TouchableOpacity>
          <Text className="text-gray-500 text-xs mt-1">
            Allowed formats: PDF, JPEG, PNG. Maximum file size per file: 5MB.
          </Text>
        </View>
        {!certificationData || certificationData.status === 'Pending' ? (
          <TouchableOpacity
            disabled={uploading}
            className="w-full py-2 px-4 bg-pink-500 rounded-md shadow"
            onPress={handleSubmit}
          >
            <Text className="text-white font-medium text-center">
              {uploading
                ? 'Uploading...'
                : certificationData
                  ? 'Update Certification'
                  : 'Submit Certification'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="mt-6 p-4 bg-green-600 rounded-md">
            <Text className="text-white text-sm">
              Certification status: <Text className="font-bold">{certificationData.status}</Text>
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default CertificationSettingsNative;
