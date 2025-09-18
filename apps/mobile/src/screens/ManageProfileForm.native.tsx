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
  Platform,
} from 'react-native';
import { Video } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import tw from '../../tailwind';
import { useManageProfileForm } from '@mytutorapp/shared/hooks';
import type { UpdatedProfileData } from '@mytutorapp/shared/types';
import { useShopContext } from '@mytutorapp/shared/context';
import type { ChangeEvent } from 'react';

// Helper to wrap a primitive into a fake React.ChangeEvent
function makeEvent(value: string): ChangeEvent<any> {
  return { target: { value } } as ChangeEvent<any>;
}

// Guard for local asset objects
function hasUri(obj: unknown): obj is { uri: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'uri' in obj &&
    typeof (obj as any).uri === 'string'
  );
}

// Resolve relative server paths or leave file URIs intact
function resolveAssetUri(raw: string, backendUrl: string): string {
  return raw.startsWith('/') ? `${backendUrl}${raw}` : raw;
}

const ManageProfileFormNative: React.FC = () => {
  const navigation = useNavigation();
  const { backendUrl } = useShopContext();

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
    handleDeleteVideo,
  } = useManageProfileForm(navigation.navigate);

  // Local preview URIs
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [previewVideoUri, setPreviewVideoUri] = useState<string | null>(null);

  async function pickImage(): Promise<void> {
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
    const asset = assets[0]!;
    setUpdatedData((prev) => ({
      ...prev,
      gallery: [asset.uri, ...prev.gallery.slice(1)],
    }));
    setPreviewImageUri(asset.uri);
  }

  // — pickVideo with duration check —
  async function pickVideo(): Promise<void> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 30, // UI hint
    });
    const assets = result.assets ?? [];
    if (result.canceled || assets.length === 0) return;
    const asset = assets[0]!;

    // Normalize duration: if it looks like ms, convert to s
    const rawDur = Number(asset.duration ?? 0);
    const durSec = rawDur > 1000 ? rawDur / 1000 : rawDur;
    if (durSec > 30) {
      Alert.alert(
        'Too long',
        `Your video is ${durSec.toFixed(1)}s. Please select one 30 seconds or shorter.`
      );
      return;
    }

    // update both hook state and preview URI
    setUpdatedData(prev => ({ ...prev, video: asset.uri }));
    setPreviewVideoUri(asset.uri);
  }
  
  const tokenRanges = {
    privateSession: { min: 20, max: 150 },
    groupSession:   { min: 15, max: 80  },
    lecture:        { min: 10, max: 50  },
    workshop:       { min: 15, max: 200 },
  } as const;
  type TokenField = keyof typeof tokenRanges;

  // Shared picker styling
  const pickerContainer  = tw`overflow-visible z-50 mb-4`;
  const pickerStyle      = tw`bg-gray-700 rounded`;
  const placeholderColor = '#9CA3AF';
  const selectedColor    = '#fff';
  const pickerItemStyle  = { height: 44 };

  // Styles
  const sectionStyle = tw`bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4`;
  const inputStyle   = tw`w-full p-3 rounded bg-gray-700 text-white mb-3`;
  const pillBase     = `px-3 py-1 mr-2 mb-2 rounded-full border`;

  // Compute display URIs
  const rawGallery = updatedData.gallery[0];
  const galleryUri = previewImageUri
    ?? (typeof rawGallery === 'string'
          ? resolveAssetUri(rawGallery, backendUrl)
          : hasUri(rawGallery)
            ? rawGallery.uri
            : '');
  const rawVideo = updatedData.video;
  const videoUri = previewVideoUri
    ?? (typeof rawVideo === 'string'
          ? resolveAssetUri(rawVideo, backendUrl)
          : hasUri(rawVideo)
            ? rawVideo.uri
            : '');

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-900`}
      contentContainerStyle={tw`p-4 pb-20`}
    >
      {/* Personal Info */}
      <View style={sectionStyle}>
        <TextInput
          placeholder="Name"
          value={updatedData.name}
          onChangeText={t =>
            handleInputChange('name', makeEvent(t))
          }
          placeholderTextColor={placeholderColor}
          style={inputStyle}
        />
        <TextInput
          placeholder="Age"
          value={String(updatedData.age)}
          keyboardType="numeric"
          onChangeText={t =>
            handleInputChange('age', makeEvent(t))
          }
          placeholderTextColor={placeholderColor}
          style={[inputStyle, tw`mb-0`]}
        />
      </View>

      {/* Languages */}
      <View style={sectionStyle}>
        <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>
          Languages
        </Text>
        <View style={tw`flex-row flex-wrap`}>
          {Object.keys(updatedData.languages).map((lang) => {
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

      {/* Student */}
      {role === 'student' && (
        <View style={sectionStyle}>
          <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>
            Age Groups
          </Text>
          <View style={tw`flex-row flex-wrap`}>
            {['Pre-Primary','Lower Primary','Upper Primary','University/College','Adults'].map((group) => {
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

      {/* Tutor */}
      {role === 'tutor' && (
        <>
          {/* Category */}
          <View style={sectionStyle}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>
              Category
            </Text>
            <View style={pickerContainer}>
              <Picker<string>
                selectedValue={updatedData.category}
                onValueChange={val =>
                  handleInputChange('category', makeEvent(val))
                }
                style={[
                  pickerStyle,
                  {
                    color: updatedData.category
                      ? selectedColor
                      : placeholderColor,
                  },
                ]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
                itemStyle={pickerItemStyle}
              >
                <Picker.Item
                  label="Select a category…"
                  value=""
                  color={placeholderColor}
                />
                {[
                  'Math Tutor',
                  'Sciences',
                  'Programming',
                  'Art & Design',
                  'Languages',
                  'Wellness',
                ].map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} color="#000" />
                ))}
              </Picker>
            </View>
          </View>

          {/* Status */}
          <View style={sectionStyle}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>
              Status
            </Text>
            <View style={pickerContainer}>
              <Picker<string>
                selectedValue={updatedData.status}
                onValueChange={val =>
                  handleInputChange('status', makeEvent(val))
                }
                style={[
                  pickerStyle,
                  {
                    color: updatedData.status
                      ? selectedColor
                      : placeholderColor,
                  },
                ]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
                itemStyle={pickerItemStyle}
              >
                <Picker.Item label="Online" value="Online" color="#000" />
                <Picker.Item label="Offline" value="Offline" color="#000" />
                <Picker.Item label="Busy" value="Busy" color="#000" />
                <Picker.Item
                  label="Free Session"
                  value="Free Session"
                  color="#000"
                />
              </Picker>
            </View>
          </View>

          {/* Notifications */}
          <View style={[sectionStyle, tw`flex-row items-center justify-between`]}>
            <Text style={tw`text-gray-300`}>Notifications</Text>
            <Switch
              value={updatedData.notifications}
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
              value={updatedData.bio}
              onChangeText={t =>
                handleInputChange('bio', makeEvent(t))
              }
              multiline
              placeholderTextColor={placeholderColor}
              style={[inputStyle, tw`h-20`]}
            />
          </View>

          {/* Pricing */}
          <View style={sectionStyle}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>
              Rates (Tokens @10Shs)
            </Text>
            <View style={tw`flex-row flex-wrap`}>
              {(Object.keys(tokenRanges) as TokenField[]).map((field) => {
                const { min, max } = tokenRanges[field];
                return (
                  <View key={field} style={tw`w-1/2 pr-2 mb-4`}>
                    <Text style={tw`text-sm text-gray-400 mb-1`}>
                      {field.replace(/([A-Z])/g, ' $1')} (Min {min}, Max {max})
                    </Text>
                    <TextInput
                      placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1')}`}
                      value={String(updatedData.pricing[field])}
                      keyboardType="numeric"
                      onChangeText={t =>
                        handlePricingChange(field, makeEvent(t))
                      }
                      placeholderTextColor={placeholderColor}
                      style={tw`w-full p-2 rounded bg-gray-700 text-gray-300 border border-gray-600 text-sm`}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Expertise */}
          <View style={sectionStyle}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Expertise</Text>
            <View style={tw`flex-row flex-wrap`}>
              {['Exam Prep','Skill Building','Homework Help','Career Guidance'].map((opt) => {
                const sel = updatedData.expertise.includes(opt);
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() =>
                      setUpdatedData((prev) => {
                        const has = prev.expertise.includes(opt);
                        return {
                          ...prev,
                          expertise: has
                            ? prev.expertise.filter((i) => i !== opt)
                            : [...prev.expertise, opt],
                        };
                      })
                    }
                    style={[
                      tw`${pillBase}`,
                      sel ? tw`bg-pink-600 border-pink-500` : tw`bg-gray-700 border-gray-600`,
                    ]}
                  >
                    <Text style={sel ? tw`text-white` : tw`text-gray-300`}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Experience Level */}
          <View style={sectionStyle}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Experience Level</Text>
            <View style={pickerContainer}>
              <Picker<string>
                selectedValue={updatedData.experienceLevel}
                onValueChange={(val: string) => handleInputChange('experienceLevel', val)}
                style={[
                  pickerStyle,
                  { color: updatedData.experienceLevel ? selectedColor : placeholderColor },
                ]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
                itemStyle={pickerItemStyle}
              >
                <Picker.Item label="Select experience level…" value="" color={placeholderColor} />
                {['Beginner','Intermediate','Advanced','Expert'].map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} color="#000" />
                ))}
              </Picker>
            </View>
          </View>

          {/* Age Groups You Teach */}
          <View style={sectionStyle}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Age Groups You Teach</Text>
            <View style={tw`flex-row flex-wrap`}>
              {['Pre-Primary','Lower Primary','Upper Primary','University/College','Adults'].map((group) => {
                const sel = updatedData.ageGroup.includes(group);
                return (
                  <TouchableOpacity
                    key={group}
                    onPress={() => handleAgeGroupSelect(group)}
                    style={[
                      tw`${pillBase}`,
                      sel ? tw`bg-pink-600 border-pink-500` : tw`bg-gray-700 border-gray-600`,
                    ]}
                  >
                    <Text style={sel ? tw`text-white` : tw`text-gray-300`}>{group}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Teaching Styles */}
          <View style={sectionStyle}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Teaching Styles</Text>
            <View style={tw`flex-row flex-wrap`}>
              {['One-on-One','Group','Workshop','Lecture'].map((style) => {
                const sel = updatedData.teachingStyle.includes(style);
                return (
                  <TouchableOpacity
                    key={style}
                    onPress={() => handleTeachingStyleSelect(style)}
                    style={[
                      tw`${pillBase}`,
                      sel ? tw`bg-pink-600 border-pink-500` : tw`bg-gray-700 border-gray-600`,
                    ]}
                  >
                    <Text style={sel ? tw`text-white` : tw`text-gray-300`}>{style}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Payment Method */}
          <View style={sectionStyle}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Payment Method</Text>
            <View style={pickerContainer}>
              <Picker<string>
                selectedValue={updatedData.paymentMethod}
                // wrap the primitive into a fake ChangeEvent here:
                onValueChange={(val) =>
                  handlePaymentMethodChange(makeEvent(val))
                }
                style={[
                  pickerStyle,
                  { color: updatedData.paymentMethod ? selectedColor : placeholderColor },
                ]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
                itemStyle={pickerItemStyle}
              >
                <Picker.Item label="Select payment method…" value="" color={placeholderColor} />
                <Picker.Item label="Bank" value="bank" color="#000" />
                <Picker.Item label="M-Pesa" value="mpesa" color="#000" />
              </Picker>
            </View>

            {updatedData.paymentMethod === 'bank' && (
              <View style={tw`mt-3`}>
                <TextInput
                  placeholder="Bank Account Number"
                  value={updatedData.bankAccount}
                  onChangeText={(t) =>
                    handlePaymentDetailsChange('bankAccount', makeEvent(t))
                  }
                  placeholderTextColor={placeholderColor}
                  style={[inputStyle, tw`mb-2`]}
                />
                <TextInput
                  placeholder="Bank Code"
                  value={updatedData.bankCode}
                  onChangeText={(t) =>
                    handlePaymentDetailsChange('bankCode', makeEvent(t))
                  }
                  placeholderTextColor={placeholderColor}
                  style={inputStyle}
                />
              </View>
            )}
            {updatedData.paymentMethod === 'mpesa' && (
              <TextInput
                placeholder="+2547XXXXXXXXX"
                value={updatedData.mpesaPhoneNumber}
                onChangeText={(t) =>
                  handlePaymentDetailsChange('mpesaPhoneNumber', makeEvent(t))
                }
                placeholderTextColor={placeholderColor}
                style={inputStyle}
              />
            )}
          </View>

          {/* Recommendations */}
          <View style={sectionStyle}>
            <TextInput
              placeholder="Search to recommend…"
              style={inputStyle}
              placeholderTextColor={placeholderColor}
              // wrap here as well:
              onChangeText={(t) => handleSearch(makeEvent(t))}
            />
            {searchResults.length > 0 && (
              <View style={tw`mb-3`}>
                {searchResults.map((prof) => (
                  <View
                    key={prof._id}
                    style={tw`flex-row justify-between items-center p-2 bg-gray-700 rounded mb-2`}
                  >
                    <Text style={tw`text-white`}>{prof.name}</Text>
                    <TouchableOpacity
                      onPress={() => handleAddRecommendation(prof._id)}
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
              updatedData.recommended.map((id) => {
                const prof = availableProfiles.find((p) => p._id === id);
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
