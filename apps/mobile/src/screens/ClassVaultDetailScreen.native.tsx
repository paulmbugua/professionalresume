// apps/mobile/src/screens/ClassVaultDetailScreen.native.tsx
import React, { useEffect } from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import tw from '../../tailwind';
import { useClassVaultDetail } from '@mytutorapp/shared/hooks/useClassVault';

type DetailRoute = RouteProp<{ params: { id: string } }, 'params'>;

export default function ClassVaultDetailScreen() {
  const route = useRoute<DetailRoute>();
  const videoId = Number(route.params.id);

  // Destructure exactly what the hook returns
  const { video, resources, unlockContent, error } =
    useClassVaultDetail(videoId);

  // On mount, load video details + attempt to unlock content
  useEffect(() => {
    unlockContent();
  }, [videoId]);

  // While fetching the video itself, show loader
  if (!video) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <ActivityIndicator size="large" color="#f472b6" />
      </View>
    );
  }

  // If there was an error (either fetch or unlock), show it
  if (error) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <Text style={tw`text-red-500 text-center`}>{error}</Text>
      </View>
    );
  }

  // Handler for downloading PDF
  const handleDownloadPdf = () => {
    if (!resources?.pdf_url) {
      return Alert.alert(
        'Access Denied',
        'You need to purchase access to download.',
      );
    }
    Linking.openURL(resources.pdf_url).catch(() =>
      Alert.alert('Error', 'Could not open PDF link.'),
    );
  };

  return (
    <ScrollView contentContainerStyle={tw`bg-gray-900 p-4 gap-6`}>
      {/* Title */}
      <Text style={tw`text-pink-400 text-2xl font-bold text-center`}>
        {video.title}
      </Text>

      {/* Preview Clip */}
      {video.preview_url && (
        <Video
          source={{ uri: video.preview_url }}
          style={tw`w-full h-48 rounded-lg`}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
        />
      )}

      {/* Metadata */}
      <View style={tw`gap-2`}>
        <Text style={tw`text-white text-lg font-semibold`}>Tutor ID:</Text>
        <Text style={tw`text-gray-300`}>{video.tutor_id}</Text>

        <Text style={tw`text-white text-lg font-semibold`}>Subject:</Text>
        <Text style={tw`text-gray-300`}>{video.subject}</Text>

        <Text style={tw`text-white text-lg font-semibold`}>Description:</Text>
        <Text style={tw`text-gray-300`}>{video.description}</Text>

        <Text style={tw`text-white text-lg font-semibold`}>Tags:</Text>
        <View style={tw`flex-row flex-wrap gap-2`}>
          {(video.tags ?? []).map((tag) => (
            <Text
              key={tag}
              style={tw`text-pink-500 text-sm bg-gray-800 px-2 py-1 rounded`}
            >
              {tag}
            </Text>
          ))}
        </View>
      </View>

      {/* Download PDF */}
      <TouchableOpacity
        onPress={handleDownloadPdf}
        style={tw`bg-pink-600 py-3 rounded-lg`}
      >
        <Text style={tw`text-white text-center text-base`}>
          {resources?.pdf_url
            ? 'Download PDF Resource'
            : 'Purchase to Access PDF'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
