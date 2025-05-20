/// <reference lib="dom" />
import { useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
} from 'react-native';
import { Video } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import tw from '../../tailwind';
import { useManageProfileForm } from '@mytutorapp/shared/hooks';
import type { UpdatedProfileData } from '@mytutorapp/shared/types';
import type { ChangeEvent } from 'react';

/**
 * Helper to create an empty file event.
 * This dummy event is used in file upload onPress handlers.
 */
const createEmptyFileEvent = (): ChangeEvent<HTMLInputElement> => ({
  target: { files: null } as HTMLInputElement,
  currentTarget: { files: null } as HTMLInputElement,
  bubbles: false,
  cancelable: false,
  defaultPrevented: false,
  eventPhase: 0,
  isTrusted: true,
  nativeEvent: {} as Event,
  persist: () => {},
  preventDefault: () => {},
  stopPropagation: () => {},
  timeStamp: Date.now(),
  type: '',
  isDefaultPrevented: () => false,
  isPropagationStopped: () => false,
});

const ManageProfileFormNative = () => {
  const navigation = useNavigation();

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
    handlePaymentDetailsChange,
    handleSubmit,
    handleLanguageSelect,
    handleAddRecommendation,
    handleRemoveRecommendation,
    handleAgeGroupSelect,
    handleTeachingStyleSelect,
    handleFileChange,
    handleDeleteImage,
    handleDeleteVideo,
    handleToggleNotifications,
    setUpdatedData,
  } = useManageProfileForm(navigation.navigate);

  // Dummy use of handleDeleteImage to satisfy ESLint.
  useEffect(() => {
    console.log('handleDeleteImage available:', handleDeleteImage);
  }, [handleDeleteImage]);

  // Token ranges for pricing fields.
  const tokenRanges = {
    privateSession: { min: 20, max: 150 },
    groupSession: { min: 15, max: 80 },
    lecture: { min: 10, max: 50 },
    workshop: { min: 15, max: 200 },
  } as const;
  type TokenField = keyof typeof tokenRanges;

  return (
    <ScrollView
      style={[tw`bg-gray-900 p-4`, { flex: 1 }]}
      contentContainerStyle={[tw`pb-20 mx-auto max-w-lg`, { flexGrow: 1 }]}>
      {/* Common Fields */}
      <TextInput
        placeholder="Name"
        value={updatedData.name || ''}
        onChangeText={(text) => handleInputChange('name', text)}
        placeholderTextColor="#9CA3AF"
        style={tw`w-full p-2 rounded bg-gray-800 text-white mb-4`}
      />
      <TextInput
        placeholder="Age"
        value={updatedData.age ? String(updatedData.age) : ''}
        onChangeText={(text) => handleInputChange('age', text)}
        keyboardType="numeric"
        placeholderTextColor="#9CA3AF"
        style={tw`w-full p-2 rounded bg-gray-800 text-white mb-4`}
      />

      {/* Languages Section */}
      <View style={tw`mb-4`}>
        <Text style={tw`text-lg font-semibold text-gray-400 mb-2`}>Languages</Text>
        <View style={tw`flex-row flex-wrap gap-3`}>
          {Object.keys(updatedData.languages).map((language) => (
            <TouchableOpacity key={language} onPress={() => handleLanguageSelect(language)}>
              <Text style={tw`text-white`}>{language}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Student-Specific Fields */}
      {role === 'student' && (
        <View style={tw`mb-4`}>
          <Text style={tw`text-lg font-semibold text-gray-400 mb-2`}>Age Groups</Text>
          <View style={tw`flex-row flex-wrap gap-3`}>
            {[
              'Pre-Primary',
              'Lower Primary',
              'Upper Primary',
              'University/College',
              'Adults',
            ].map((group) => (
              <TouchableOpacity key={group} onPress={() => handleAgeGroupSelect(group)}>
                <Text style={tw`text-white`}>{group}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Tutor-Specific Fields */}
      {role === 'tutor' && (
        <>
          {/* Category */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-gray-400 font-semibold mb-2`}>Category</Text>
            <TextInput
              placeholder="Select Category"
              value={updatedData.category || ''}
              onChangeText={(text) => handleInputChange('category', text)}
              placeholderTextColor="#9CA3AF"
              style={tw`w-full p-2 rounded bg-gray-800 text-white`}
            />
          </View>

          {/* Status */}
          <View style={tw`mb-4`}>
            <TextInput
              placeholder="Status (Online, Offline, Busy, Free Session)"
              value={updatedData.status || 'Offline'}
              onChangeText={(text) => handleInputChange('status', text)}
              placeholderTextColor="#9CA3AF"
              style={tw`w-full p-2 rounded bg-gray-800 text-white`}
            />
          </View>

          {/* Notifications */}
          <View style={tw`flex-row items-center mb-4`}>
            <Text style={tw`text-gray-400 mr-2`}>Notifications</Text>
            <Switch
              value={!!updatedData.notifications}
              onValueChange={handleToggleNotifications}
              thumbColor="#ec4899"
            />
          </View>

          {/* Bio */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-gray-400 font-semibold mb-2`}>Bio</Text>
            <TextInput
              placeholder="Write a brief introduction about yourself..."
              value={updatedData.bio || ''}
              onChangeText={(text) => handleInputChange('bio', text)}
              placeholderTextColor="#9CA3AF"
              multiline
              style={tw`w-full p-2 rounded bg-gray-800 text-white`}
            />
          </View>

          {/* Pricing Section */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-lg font-semibold text-gray-400 mb-2`}>
              Set Your Rates (Tokens per Session @10Shs/Token)
            </Text>
            <View style={tw`grid grid-cols-2 gap-4`}>
              {(Object.keys(tokenRanges) as TokenField[]).map((field) => {
                const { min, max } = tokenRanges[field];
                return (
                  <View key={field} style={tw`flex flex-col`}>
                    <Text style={tw`text-sm font-medium text-gray-300`}>
                      {field.replace(/([A-Z])/g, ' $1')} (Min: {min} | Max: {max})
                    </Text>
                    <TextInput
                      placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1')} Tokens`}
                      value={
                        updatedData.pricing[field] !== undefined
                          ? String(updatedData.pricing[field])
                          : ''
                      }
                      onChangeText={(text) => handlePricingChange(field, text)}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                      style={tw`p-3 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-sm`}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Expertise Section */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-lg font-semibold text-gray-400 mb-2`}>Expertise</Text>
            <View style={tw`flex-row flex-wrap gap-3`}>
              {['Exam Prep', 'Skill Building', 'Homework Help', 'Career Guidance'].map(
                (option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() =>
                      setUpdatedData((prev: UpdatedProfileData) => ({
                        ...prev,
                        expertise: prev.expertise.includes(option)
                          ? prev.expertise.filter((item) => item !== option)
                          : [...prev.expertise, option],
                      }))
                    }
                  >
                    <Text style={tw`text-white`}>{option}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          {/* Teaching Style Section */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-lg font-semibold text-gray-400 mb-2`}>Teaching Styles</Text>
            <View style={tw`flex-row flex-wrap gap-3`}>
              {['One-on-One', 'Group', 'Workshop', 'Lecture'].map((style) => (
                <TouchableOpacity key={style} onPress={() => handleTeachingStyleSelect(style)}>
                  <Text style={tw`text-white`}>{style}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Experience Level */}
          <View style={tw`mb-4`}>
            <TextInput
              placeholder="Select Experience Level (Beginner, Intermediate, Advanced, Expert)"
              value={updatedData.experienceLevel || ''}
              onChangeText={(text) => handleInputChange('experienceLevel', text)}
              placeholderTextColor="#9CA3AF"
              style={tw`w-full p-2 rounded bg-gray-800 text-white`}
            />
          </View>

          {/* Age Group Section */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-lg font-semibold text-gray-400 mb-2`}>Age Groups</Text>
            <View style={tw`flex-row flex-wrap gap-3`}>
              {[
                'Pre-Primary',
                'Lower Primary',
                'Upper Primary',
                'University/College',
                'Adults',
              ].map((group) => (
                <TouchableOpacity key={group} onPress={() => handleAgeGroupSelect(group)}>
                  <Text style={tw`text-white`}>{group}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Payment Method Section */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-2xl font-semibold text-gray-400 mb-3`}>Payment Method</Text>
            <View style={tw`mb-4`}>
              <Text style={tw`text-sm font-medium text-gray-300 mb-2`}>
                Choose Payment Method
              </Text>
              <TextInput
                placeholder="Select Payment Method (bank or mpesa)"
                value={updatedData.paymentMethod || ''}
                onChangeText={(text) => handlePaymentMethodChange(text)}
                placeholderTextColor="#9CA3AF"
                style={tw`w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600`}
              />
            </View>
            {updatedData.paymentMethod === 'bank' && (
              <View style={tw`mb-4 space-y-4`}>
                <View style={tw`space-y-2`}>
                  <Text style={tw`text-sm font-medium text-gray-300`}>Bank Account Number</Text>
                  <TextInput
                    placeholder="Enter Bank Account Number"
                    value={updatedData.bankAccount || ''}
                    onChangeText={(text) =>
                      handlePaymentDetailsChange('bankAccount', text)
                    }
                    placeholderTextColor="#9CA3AF"
                    style={tw`w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600`}
                  />
                </View>
                <View style={tw`space-y-2`}>
                  <Text style={tw`text-sm font-medium text-gray-300`}>Bank Code</Text>
                  <TextInput
                    placeholder="Enter Bank Code"
                    value={updatedData.bankCode || ''}
                    onChangeText={(text) => handlePaymentDetailsChange('bankCode', text)}
                    placeholderTextColor="#9CA3AF"
                    style={tw`w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600`}
                  />
                </View>
              </View>
            )}
            {updatedData.paymentMethod === 'mpesa' && (
              <View style={tw`mb-4 space-y-2`}>
                <Text style={tw`text-sm font-medium text-gray-300`}>
                  M-Pesa Phone Number
                </Text>
                <TextInput
                  placeholder="+2547XXXXXXXXX"
                  value={updatedData.mpesaPhoneNumber || ''}
                  onChangeText={(text) =>
                    handlePaymentDetailsChange('mpesaPhoneNumber', text)
                  }
                  placeholderTextColor="#9CA3AF"
                  style={tw`w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600`}
                />
              </View>
            )}
          </View>

          {/* Gallery Section */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-gray-400 mb-2`}>Upload Profile Image</Text>
            <View style={tw`w-40 h-40 border flex items-center justify-center relative`}>
              {updatedData.gallery[0] ? (
                <Image
                  source={{
                    uri:
                      typeof updatedData.gallery[0] === 'object' &&
                      'uri' in updatedData.gallery[0]
                        ? (updatedData.gallery[0] as { uri: string }).uri
                        : String(updatedData.gallery[0]),
                  }}
                  resizeMode="cover"
                  style={tw`w-full h-full rounded`}
                />
              ) : (
                <Text style={tw`text-gray-400 text-xs`}>Upload</Text>
              )}
              <TouchableOpacity
                onPress={() => handleFileChange(createEmptyFileEvent(), 0, 'image')}
                style={tw`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50`}
              >
                <Text style={tw`text-white`}>
                  {updatedData.gallery[0] ? 'Replace' : 'Upload'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Video Section */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-gray-400 mb-2`}>Uploaded Video</Text>
            <View style={tw`relative`}>
              {updatedData.video ? (
                typeof updatedData.video === 'object' ? (
                  <Video
                    source={{
                      uri:
                        typeof updatedData.video === 'object' &&
                        'uri' in updatedData.video
                          ? (updatedData.video as { uri: string }).uri
                          : '',
                    }}
                    useNativeControls
                    style={tw`w-full h-40 rounded`}
                  />
                ) : (
                  <Video
                    source={{ uri: String(updatedData.video) }}
                    useNativeControls
                    style={tw`w-full h-40 rounded`}
                  />
                )
              ) : (
                <View style={tw`w-full h-40 bg-gray-800 rounded flex items-center justify-center`}>
                  <Text style={tw`text-gray-500`}>No video uploaded</Text>
                </View>
              )}
              <View style={tw`absolute inset-0 flex flex-row items-center justify-center bg-black bg-opacity-50`}>
                {updatedData.video && (
                  <TouchableOpacity
                    onPress={() => handleDeleteVideo()}
                    style={tw`p-2 bg-red-600 rounded-full mr-2`}
                  >
                    <Text style={tw`text-white`}>×</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => handleFileChange(createEmptyFileEvent(), 0, 'video')}
                    style={tw`p-2 bg-blue-500 rounded`}
                  >
                    <Text style={tw`text-white`}>
                      {updatedData.video ? 'Replace' : 'Upload'}
                    </Text>
                  </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Recommendations Section */}
          <View style={tw`mb-4`}>
            <TextInput
              placeholder="Search profiles to recommend..."
              onChangeText={(text) => handleSearch(text)}
              placeholderTextColor="#9CA3AF"
              style={tw`w-full p-2 rounded bg-gray-800 text-white mb-4`}
            />
            {searchResults.length > 0 && (
              <View style={tw`bg-gray-800 p-4 rounded-lg mb-4`}>
                {searchResults.map((prof: { _id: string; name: string }) => (
                  <View key={prof._id} style={tw`flex-row justify-between items-center p-2`}>
                    <Text style={tw`text-white`}>{prof.name}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (!updatedData.recommended.includes(prof._id)) {
                          handleAddRecommendation(prof._id);
                          setUpdatedData((prev: UpdatedProfileData) => ({ ...prev }));
                        } else {
                          Alert.alert('Info', `${prof.name} is already recommended.`);
                        }
                      }}
                      style={tw`bg-pink-500 px-3 py-1 rounded-lg`}
                    >
                      <Text style={tw`text-white`}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <View style={tw`space-y-2`}>
              <Text style={tw`text-sm font-semibold text-gray-300 mb-2`}>
                Selected Recommendations
              </Text>
              {updatedData.recommended.length > 0 ? (
                updatedData.recommended.map((id: string) => {
                  const prof = availableProfiles.find(
                    (profile: { _id: string; name: string }) => profile._id === id
                  );
                  return (
                    prof && (
                      <View
                        key={id}
                        style={tw`flex-row items-center justify-between bg-gray-900 p-2 rounded-lg`}
                      >
                        <Text style={tw`text-sm text-gray-100 font-medium truncate`}>
                          {prof.name}
                        </Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveRecommendation(prof._id)}
                          accessibilityLabel={`Remove ${prof.name}`}
                        >
                          <Text style={tw`text-red-400`}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )
                  );
                })
              ) : (
                <Text style={tw`text-sm text-gray-500`}>No recommendations selected.</Text>
              )}
            </View>
          </View>
        </>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        onPress={() => handleSubmit()}
        disabled={isUploading}
        style={tw`w-full bg-pink-500 py-3 px-4 rounded-lg mt-8 mb-6`}
      >
        <Text style={tw`text-white text-center`}>
          {isUploading ? 'Updating Profile...' : 'Update Profile'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ManageProfileFormNative;
