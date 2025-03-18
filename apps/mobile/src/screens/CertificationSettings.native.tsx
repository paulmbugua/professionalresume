// /apps/mobile/src/screens/CertificationSettings.native.tsx
import React, { useContext, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useCertificationSettings } from '@shared/hooks/useCertificationSettings';
import { ShopContext } from '@shared/context/ShopContext';
import tw from 'twrnc';

// Define a local type for a successful document picker result.
type MyDocumentResult = {
  type: 'success';
  name: string;
  uri: string;
  size: number;
};

const CertificationSettings = () => {
  const shopCtx = useContext(ShopContext);
  if (!shopCtx) {
    throw new Error("ShopContext is not provided!");
  }
  const { token, backendUrl, profile } = shopCtx;
  
  // Only tutors can upload certification documents.
  if (!profile || !profile.role || profile.role.toLowerCase() !== 'tutor') {
    return (
      <View style={tw`w-full max-w-lg mx-auto bg-gray-900 p-6 rounded-lg shadow-md`}>
        <Text style={tw`text-3xl font-bold text-pink-400 mb-4`}>Tutor Certification</Text>
        <Text style={tw`text-gray-400 text-sm`}>
          Certification upload is available only for tutors.
        </Text>
      </View>
    );
  }

  // Ensure profile.id is always a string (use empty string if undefined)
  const profileId: string = profile.id || "";

  // Use our shared hook; pass in backendUrl, token, and profileId.
  const { files, uploading, certificationData, handleFileChange, handleSubmit } =
    useCertificationSettings(backendUrl, token, profileId);

  // Local state to hold DocumentPicker results
  const [localFiles, setLocalFiles] = useState<MyDocumentResult[]>([]);

  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
      });
      // Check if the result indicates success.
      // We use a cast (result as any) because the provided types don't include these properties.
      if ((result as any).type === 'success') {
        const docResult: MyDocumentResult = {
          type: 'success',
          name: (result as any).name, // Cast to any to bypass type errors.
          uri: (result as any).uri,
          size: (result as any).size,
        };
        setLocalFiles([docResult]);
        // Optionally, if your hook expects files, you can also pass them:
        // handleFileChange([docResult] as any);
      }
    } catch (error) {
      console.error("Error picking document:", error);
    }
  };

  // In mobile, simulate form submission without an event parameter.
  const onSubmit = async () => {
    if (localFiles.length === 0) {
      Alert.alert("Please select at least one document.");
      return;
    }
    await handleSubmit();
  };

  return (
    <ScrollView contentContainerStyle={tw`p-4`} style={tw`bg-gray-900`}>
      <View style={tw`bg-gray-800 p-6 rounded-lg shadow-lg`}>
        <Text style={tw`text-3xl font-bold text-pink-400 mb-4`}>Tutor Certification</Text>
        <Text style={tw`text-gray-400 mb-6 text-sm`}>
          (Optional) Enhance your profile's credibility by submitting your qualification documents.
          You can upload files (each max 5MB, PDF/JPEG/PNG).
        </Text>
        <TouchableOpacity
          onPress={pickDocuments}
          style={tw`bg-gray-700 p-4 rounded mb-4`}
        >
          <Text style={tw`text-white text-center`}>Select Documents</Text>
        </TouchableOpacity>
        {localFiles.length > 0 && (
          <View style={tw`mb-4`}>
            {localFiles.map((file, index) => (
              <Text key={index} style={tw`text-gray-300`}>
                {file.name}
              </Text>
            ))}
          </View>
        )}
        {uploading ? (
          <ActivityIndicator size="large" color="#EC4899" />
        ) : (
          <TouchableOpacity
            onPress={onSubmit}
            style={tw`bg-pink-500 p-4 rounded`}
          >
            <Text style={tw`text-white text-center`}>
              {certificationData ? "Update Certification" : "Submit Certification"}
            </Text>
          </TouchableOpacity>
        )}
        {certificationData && certificationData.status !== 'Pending' && (
          <View style={tw`mt-6 p-4 bg-green-600 rounded`}>
            <Text style={tw`text-white text-sm`}>
              Certification status: <Text style={tw`font-bold`}>{certificationData.status}</Text>
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default CertificationSettings;
