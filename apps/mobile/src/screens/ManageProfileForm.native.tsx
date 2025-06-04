/* eslint-disable prettier/prettier */ 
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';
import { Video } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import tw from '../../tailwind';
import { useManageProfileForm } from '@mytutorapp/shared/hooks';
import type { UpdatedProfileData } from '@mytutorapp/shared/types';
import { useShopContext } from '@mytutorapp/shared/context';

/** Guard for { uri } */
function hasUri(obj: unknown): obj is { uri: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'uri' in obj &&
    typeof (obj as any).uri === 'string'
  );
}

// Helper to turn a server‐relative path into a full URL, or pass through file‐URIs
function resolveAssetUri(
  raw: string,
  backendUrl: string
): string {
  if (raw.startsWith('/')) {
   
    return `${backendUrl}${raw}`;
  }
  return raw;
}

const ManageProfileFormNative: React.FC = () => {
  const navigation = useNavigation();
  const { backendUrl } = useShopContext();  // grab the current backend URL from context

  const {
    role,
    updatedData,
    availableProfiles,
    searchResults,
    isUploading,
    handleInputChange,
    handleSearch,
    handlePricingChange,
    handlePaymentMethodChange,
    handleSubmit,
    handleLanguageSelect,
    handleAddRecommendation,
    handleRemoveRecommendation,
    handleAgeGroupSelect,
    handleTeachingStyleSelect,
    handleToggleNotifications,
    setUpdatedData,
    handlePaymentDetailsChange,
    handleDeleteVideo,      // ◀ this is used to remove the video
  } = useManageProfileForm(navigation.navigate);

  // Local preview URIs so they survive a submit
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [previewVideoUri, setPreviewVideoUri] = useState<string | null>(null);

  useEffect(() => {
    console.log('Form hook ready');
  }, []);

  // — pickImage with non-null assertion —
  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    const assets = result.assets ?? [];
    if (result.canceled || assets.length === 0) return;

    const asset = assets[0]!; // guaranteed by the length check
    if (!asset.uri) return;   // sanity
    setUpdatedData(prev => ({
      ...prev,
      gallery: [asset.uri, ...prev.gallery.slice(1)],
    }));
    setPreviewImageUri(asset.uri);
  }

  // — pickVideo with non-null assertion —
  async function pickVideo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });
    const assets = result.assets ?? [];
    if (result.canceled || assets.length === 0) return;

    const asset = assets[0]!; // guaranteed
    if (!asset.uri) return;
    setUpdatedData(prev => ({
      ...prev,
      video: asset.uri,
    }));
    setPreviewVideoUri(asset.uri);
  }

  // Token ranges
  const tokenRanges = {
    privateSession: { min: 20, max: 150 },
    groupSession:   { min: 15, max: 80  },
    lecture:        { min: 10, max: 50  },
    workshop:       { min: 15, max: 200 },
  } as const;
  type TokenField = keyof typeof tokenRanges;

  // Styles
  const sectionStyle = tw`bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4`;
  const inputStyle   = tw`w-full p-3 rounded bg-gray-700 text-white mb-3`;
  const pillBase     = `px-3 py-1 mr-2 mb-2 rounded-full border`;

  // derive the display URIs
  // 1) If the user just picked a local file, use `previewImageUri`.  
  // 2) Otherwise, updatedData.gallery[0] may be a string: either a file:// URI or a server‐relative path.
  const rawGallery = updatedData.gallery[0];
  const galleryUri = previewImageUri
    ?? (
      typeof rawGallery === 'string'
        ? resolveAssetUri(rawGallery, backendUrl)
        : hasUri(rawGallery)
          ? rawGallery.uri
          : ''
    );

  const rawVideo = updatedData.video;
  const videoUri = previewVideoUri
    ?? (
      typeof rawVideo === 'string'
        ? resolveAssetUri(rawVideo, backendUrl)
        : hasUri(rawVideo)
          ? rawVideo.uri
          : ''
    );

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-900`}
      contentContainerStyle={tw`p-4 pb-20`}
    >
      {/* — Personal Info — */}
      <View style={sectionStyle}>
        <TextInput
          placeholder="Name"
          value={updatedData.name || ''}
          onChangeText={t => handleInputChange('name', t)}
          placeholderTextColor="#9CA3AF"
          style={inputStyle}
        />
        <TextInput
          placeholder="Age"
          value={updatedData.age ? String(updatedData.age) : ''}
          onChangeText={t => handleInputChange('age', t)}
          keyboardType="numeric"
          placeholderTextColor="#9CA3AF"
          style={[inputStyle, { marginBottom: 0 }]}
        />
      </View>

      {/* — Languages — */}
      <View style={sectionStyle}>
        <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>
          Languages
        </Text>
        <View style={tw`flex-row flex-wrap`}>
          {Object.keys(updatedData.languages).map(lang => {
            const sel = updatedData.languages[lang];
            return (
              <TouchableOpacity
                key={lang}
                onPress={() => handleLanguageSelect(lang)}
                style={[
                  tw`${pillBase}`,
                  sel
                    ? tw`bg-pink-600 border-pink-500`
                    : tw`bg-gray-700 border-gray-600`,
                ]}
              >
                <Text style={sel ? tw`text-white` : tw`text-gray-300`}>
                  {lang}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* — Student — */}
      {role === 'student' && (
        <View style={sectionStyle}>
          <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>
            Age Groups
          </Text>
          <View style={tw`flex-row flex-wrap`}>
            {[
              'Pre-Primary',
              'Lower Primary',
              'Upper Primary',
              'University/College',
              'Adults',
            ].map(group => {
              const sel = updatedData.ageGroup.includes(group);
              return (
                <TouchableOpacity
                  key={group}
                  onPress={() => handleAgeGroupSelect(group)}
                  style={[
                    tw`${pillBase}`,
                    sel
                      ? tw`bg-pink-600 border-pink-500`
                      : tw`bg-gray-700 border-gray-600`,
                  ]}
                >
                  <Text style={sel ? tw`text-white` : tw`text-gray-300`}>
                    {group}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* — Tutor — */}
      {role === 'tutor' && (
        <>
          {/* Category */}
          <View style={sectionStyle}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Category</Text>
            <Picker<string>
              selectedValue={updatedData.category}
              onValueChange={val => handleInputChange('category', val)}
              style={tw`bg-gray-700 rounded`}
            >
              <Picker.Item label="Select a category…" value="" />
              <Picker.Item label="Math Tutor" value="Math Tutor" />
              <Picker.Item label="Sciences"   value="Sciences"   />
              <Picker.Item label="Programming" value="Programming" />
              <Picker.Item label="Art & Design" value="Art & Design" />
              <Picker.Item label="Languages"   value="Languages"   />
              <Picker.Item label="Wellness"    value="Wellness"    />
            </Picker>
          </View>

          {/* Status */}
          <View style={sectionStyle}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Status</Text>
            <Picker<string>
              selectedValue={updatedData.status}
              onValueChange={val => handleInputChange('status', val)}
              style={tw`bg-gray-700 rounded`}
            >
              <Picker.Item label="Online" value="Online" />
              <Picker.Item label="Offline" value="Offline" />
              <Picker.Item label="Busy" value="Busy" />
              <Picker.Item label="Free Session" value="Free Session" />
            </Picker>
          </View>

          {/* Notifications */}
          <View
            style={[sectionStyle, tw`flex-row items-center justify-between`]}
          >
            <Text style={tw`text-gray-300`}>Notifications</Text>
            <Switch
              value={!!updatedData.notifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#374151', true: '#ec4899' }}
              thumbColor="#f9fafb"
            />
          </View>

          {/* Bio */}
          <View style={sectionStyle}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Bio</Text>
            <TextInput
              placeholder="Write a brief introduction..."
              value={updatedData.bio || ''}
              onChangeText={t => handleInputChange('bio', t)}
              placeholderTextColor="#9CA3AF"
              multiline
              style={[inputStyle, { height: 80 }]}
            />
          </View>

          {/* Pricing */}
          <View style={sectionStyle}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>
              Rates (Tokens @10Shs)
            </Text>
            <View style={tw`flex-row flex-wrap`}>
              {(Object.keys(tokenRanges) as TokenField[]).map(field => {
                const { min, max } = tokenRanges[field];
                return (
                  <View key={field} style={tw`w-1/2 pr-2 mb-4`}>
                    <Text style={tw`text-sm text-gray-400 mb-1`}>
                      {field.replace(/([A-Z])/g, ' $1')} (Min {min}, Max {max})
                    </Text>
                    <TextInput
                      placeholder={`Enter ${field.replace(
                        /([A-Z])/g,
                        ' $1'
                      )}`}
                      value={
                        updatedData.pricing[field] != null
                          ? String(updatedData.pricing[field])
                          : ''
                      }
                      onChangeText={t => handlePricingChange(field, t)}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                      style={tw`w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 text-sm`}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Expertise */}
          <View style={sectionStyle}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>
              Expertise
            </Text>
            <View style={tw`flex-row flex-wrap`}>
              {[
                'Exam Prep',
                'Skill Building',
                'Homework Help',
                'Career Guidance',
              ].map(opt => {
                const sel = updatedData.expertise.includes(opt);
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() =>
                      setUpdatedData(prev => {
                        const has = prev.expertise.includes(opt);
                        return {
                          ...prev,
                          expertise: has
                            ? prev.expertise.filter(i => i !== opt)
                            : [...prev.expertise, opt],
                        };
                      })
                    }
                    style={[
                      tw`${pillBase}`,
                      sel
                        ? tw`bg-pink-600 border-pink-500`
                        : tw`bg-gray-700 border-gray-600`,
                    ]}
                  >
                    <Text style={sel ? tw`text-white` : tw`text-gray-300`}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Experience Level */}
          <View style={sectionStyle}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>
              Experience Level
            </Text>
            <Picker<string>
              selectedValue={updatedData.experienceLevel}
              onValueChange={val => handleInputChange('experienceLevel', val)}
              style={tw`bg-gray-700 rounded`}
            >
              <Picker.Item label="Select experience level…" value="" />
              <Picker.Item label="Beginner" value="Beginner" />
              <Picker.Item label="Intermediate" value="Intermediate" />
              <Picker.Item label="Advanced" value="Advanced" />
              <Picker.Item label="Expert" value="Expert" />
            </Picker>
          </View>

          {/* Age Groups You Teach */}
          <View style={sectionStyle}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>
              Age Groups You Teach
            </Text>
            <View style={tw`flex-row flex-wrap`}>
              {[
                'Pre-Primary',
                'Lower Primary',
                'Upper Primary',
                'University/College',
                'Adults',
              ].map(group => {
                const sel = updatedData.ageGroup.includes(group);
                return (
                  <TouchableOpacity
                    key={group}
                    onPress={() => handleAgeGroupSelect(group)}
                    style={[
                      tw`${pillBase}`,
                      sel
                        ? tw`bg-pink-600 border-pink-500`
                        : tw`bg-gray-700 border-gray-600`,
                    ]}
                  >
                    <Text style={sel ? tw`text-white` : tw`text-gray-300`}>
                      {group}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Teaching Styles */}
          <View style={sectionStyle}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>
              Teaching Styles
            </Text>
            <View style={tw`flex-row flex-wrap`}>
              {['One-on-One', 'Group', 'Workshop', 'Lecture'].map(style => {
                const sel = updatedData.teachingStyle.includes(style);
                return (
                  <TouchableOpacity
                    key={style}
                    onPress={() => handleTeachingStyleSelect(style)}
                    style={[
                      tw`${pillBase}`,
                      sel
                        ? tw`bg-pink-600 border-pink-500`
                        : tw`bg-gray-700 border-gray-600`,
                    ]}
                  >
                    <Text style={sel ? tw`text-white` : tw`text-gray-300`}>
                      {style}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Payment Method */}
          <View style={sectionStyle}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>
              Payment Method
            </Text>
            <Picker<string>
              selectedValue={updatedData.paymentMethod}
              onValueChange={val => handlePaymentMethodChange(val)}
              style={tw`bg-gray-700 rounded`}
            >
              <Picker.Item label="Select method…" value="" />
              <Picker.Item label="Bank" value="bank" />
              <Picker.Item label="M-Pesa" value="mpesa" />
            </Picker>

            {updatedData.paymentMethod === 'bank' && (
              <View style={tw`mt-3`}>
                <TextInput
                  placeholder="Bank Account Number"
                  value={updatedData.bankAccount || ''}
                  onChangeText={t =>
                    handlePaymentDetailsChange('bankAccount', t)
                  }
                  placeholderTextColor="#9CA3AF"
                  style={[inputStyle, { marginBottom: 8 }]}
                />
                <TextInput
                  placeholder="Bank Code"
                  value={updatedData.bankCode || ''}
                  onChangeText={t => handlePaymentDetailsChange('bankCode', t)}
                  placeholderTextColor="#9CA3AF"
                  style={inputStyle}
                />
              </View>
            )}
            {updatedData.paymentMethod === 'mpesa' && (
              <TextInput
                placeholder="+2547XXXXXXXXX"
                value={updatedData.mpesaPhoneNumber || ''}
                onChangeText={t =>
                  handlePaymentDetailsChange('mpesaPhoneNumber', t)
                }
                placeholderTextColor="#9CA3AF"
                style={inputStyle}
              />
            )}
          </View>

          {/* Gallery */}
          <View style={[sectionStyle, styles.shadow]}>
            <Text style={tw`text-gray-300 mb-2`}>Profile Image</Text>
            <View style={tw`w-40 h-40 bg-gray-700 rounded-lg overflow-hidden mb-3`}>
              {galleryUri ? (
                <Image source={{ uri: galleryUri }} style={tw`w-full h-full`} />
              ) : (
                <View style={tw`flex-1 items-center justify-center`}>
                  <Text style={tw`text-gray-500`}>No image</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={pickImage}
                style={tw`absolute inset-0 items-center justify-center bg-black bg-opacity-30`}
              >
                <Text style={tw`text-white`}>
                  {galleryUri ? 'Replace' : 'Upload'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Video */}
          <View style={sectionStyle}>
            <Text style={tw`text-gray-300 mb-2`}>Profile Video</Text>
            <View style={tw`w-full h-40 bg-gray-700 rounded-lg overflow-hidden mb-3`}>
              {videoUri ? (
                <Video
                  source={{ uri: videoUri }}
                  useNativeControls
                  style={tw`w-full h-full`}
                />
              ) : (
                <View style={tw`flex-1 items-center justify-center`}>
                  <Text style={tw`text-gray-500`}>No video</Text>
                </View>
              )}
              <View style={tw`absolute inset-0 flex-row items-center justify-center bg-black bg-opacity-30`}>
                {videoUri && (
                  <TouchableOpacity
                    onPress={handleDeleteVideo}
                    style={tw`p-2 bg-red-600 rounded-full mr-2`}
                  >
                    <Text style={tw`text-white`}>×</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={pickVideo} style={tw`p-2 bg-blue-500 rounded`}>
                  <Text style={tw`text-white`}>{videoUri ? 'Replace' : 'Upload'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Recommendations */}
          <View style={sectionStyle}>
            <TextInput
              placeholder="Search to recommend…"
              onChangeText={t => handleSearch(t)}
              placeholderTextColor="#9CA3AF"
              style={inputStyle}
            />
            {searchResults.length > 0 && (
              <View style={tw`mb-3`}>
                {searchResults.map(prof => (
                  <View
                    key={prof._id}
                    style={tw`flex-row justify-between items-center p-2 bg-gray-700 rounded mb-2`}
                  >
                    <Text style={tw`text-white`}>{prof.name}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (!updatedData.recommended.includes(prof._id)) {
                          handleAddRecommendation(prof._id);
                          setUpdatedData(prev => ({ ...prev }));
                        } else {
                          Alert.alert('Info', `${prof.name} already recommended.`);
                        }
                      }}
                      style={tw`bg-pink-600 px-3 py-1 rounded-full`}
                    >
                      <Text style={tw`text-white text-sm`}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Selected</Text>
            {updatedData.recommended.length > 0 ? (
              updatedData.recommended.map(id => {
                const prof = availableProfiles.find(p => p._id === id);
                return (
                  prof && (
                    <View
                      key={id}
                      style={tw`flex-row items-center justify-between bg-gray-700 p-3 rounded mb-2`}
                    >
                      <Text style={tw`text-white flex-1`}>{prof.name}</Text>
                      <TouchableOpacity onPress={() => handleRemoveRecommendation(id)}>
                        <Text style={tw`text-red-400 text-lg`}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  )
                );
              })
            ) : (
              <Text style={tw`text-gray-500`}>No recommendations.</Text>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={() => handleSubmit()}
            disabled={isUploading}
            style={tw`bg-pink-600 py-3 rounded-lg items-center`}
          >
            <Text style={tw`text-white font-semibold`}>
              {isUploading ? 'Updating…' : 'Update Profile'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

export default ManageProfileFormNative;

const styles = StyleSheet.create({
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
});
