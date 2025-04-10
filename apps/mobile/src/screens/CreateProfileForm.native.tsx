import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Video } from 'expo-av';
import tw from 'twrnc';
import { useProfileForm } from '@shared/hooks';

// Define a minimal navigation type
type RootStackParamList = {
  Home: undefined;
  // Add any additional routes as needed
};

// Define union type for pricing keys
type PricingKeys = 'privateSession' | 'groupSession' | 'workshop' | 'lecture';
const pricingFields: PricingKeys[] = ['privateSession', 'groupSession', 'workshop', 'lecture'];

const CreateProfileFormNative: React.FC = () => {
  // Type the navigation instance using RootStackParamList
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const {
    role,
    name,
    setName,
    age,
    setAge,
    languages,
    handleLanguageSelect,
    ageGroup,
    handleAgeGroupChange,
    category,
    setCategory,
    bio,
    setBio,
    expertise,
    setExpertise,
    teachingStyle,
    setTeachingStyle,
    pricing,
    handlePricingChange, // (field: PricingKeys, value: string)
    paymentMethod,
    setPaymentMethod,
    bankAccount,
    setBankAccount,
    bankCode,
    setBankCode,
    mpesaPhoneNumber,
    setMpesaPhoneNumber,
    images,
    videoPreview,
    handleRemoveVideo,
    loading,
    handleSubmit,
  } = useProfileForm({
    onSuccess: () => navigation.navigate('Home'),
  });

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-900 p-4`}
      contentContainerStyle={tw`space-y-6 rounded-lg shadow-lg mx-auto relative`}
    >
      <Text style={tw`text-2xl font-bold text-pink-400 text-center`}>
        Create Your Profile
      </Text>

      {role ? (
        <View style={tw`space-y-2`}>
          <Text style={tw`text-base text-gray-400`}>Your Role</Text>
          <Text style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}>
            {role}
          </Text>
        </View>
      ) : (
        <Text style={tw`text-gray-400`}>Fetching your role...</Text>
      )}

      <TextInput
        placeholder="Your Name"
        value={name}
        onChangeText={setName}
        style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
        placeholderTextColor="#9CA3AF"
      />

      <TextInput
        placeholder={`Age (${role === 'tutor' ? '18+' : '5+'})`}
        value={age}
        onChangeText={setAge}
        style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
        keyboardType="numeric"
        placeholderTextColor="#9CA3AF"
      />

      {/* Language Selection */}
      <View style={tw`space-y-2 mt-4`}>
        <Text style={tw`text-base text-gray-400`}>Select Languages You Speak</Text>
        <View style={tw`flex-row flex-wrap gap-2`}>
          {Object.keys(languages).map((language) => (
            <TouchableOpacity
              key={language}
              onPress={() => handleLanguageSelect(language)}
              style={[
                tw`p-2 rounded border`,
                languages[language] ? tw`bg-pink-500` : tw`bg-gray-800`,
              ]}
            >
              <Text style={languages[language] ? tw`text-white` : tw`text-gray-400`}>
                {language}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Student-specific fields */}
      {role === 'student' && (
        <>
          <Text style={tw`text-base font-semibold text-gray-400 mt-4`}>
            Age Group
          </Text>
          <View style={tw`flex-row flex-wrap gap-3`}>
            {[
              'Pre-Primary',
              'Lower Primary',
              'Upper Primary',
              'University/College',
              'Adults',
            ].map((group) => (
              <TouchableOpacity
                key={group}
                onPress={() => handleAgeGroupChange(group)}
                style={[
                  tw`p-2 rounded-lg`,
                  ageGroup.includes(group) ? tw`bg-pink-500` : tw`bg-gray-800`,
                ]}
              >
                <Text
                  style={
                    ageGroup.includes(group) ? tw`text-white` : tw`text-gray-300`
                  }
                >
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Tutor-specific fields */}
      {role === 'tutor' && (
        <>
          {/* Category */}
          <View style={tw`space-y-2`}>
            <Text style={tw`text-base text-gray-400`}>
              Select Subject or Skill Category
            </Text>
            {/* Replace with a Picker if desired */}
            <TextInput
              placeholder="Select a category"
              value={category}
              onChangeText={setCategory}
              style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Payment Method */}
          <View style={tw`space-y-2`}>
            <Text style={tw`text-base text-gray-400`}>Payment Method</Text>
            {/* Replace with a Picker if desired */}
            <TextInput
              placeholder="Select payment method"
              value={paymentMethod}
              onChangeText={setPaymentMethod}
              style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {paymentMethod === 'bank' && (
            <View style={tw`space-y-2`}>
              <Text style={tw`text-base text-gray-400`}>
                Bank Account Details
              </Text>
              <TextInput
                placeholder="Enter your Bank Account Number"
                value={bankAccount}
                onChangeText={setBankAccount}
                style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          {paymentMethod === 'bank' && (
            <View style={tw`space-y-2`}>
              <Text style={tw`text-base text-gray-400`}>Bank Code</Text>
              <TextInput
                placeholder="Enter your Bank Code"
                value={bankCode}
                onChangeText={setBankCode}
                style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          {paymentMethod === 'mpesa' && (
            <View style={tw`space-y-2`}>
              <Text style={tw`text-base text-gray-400`}>
                M-Pesa Phone Number
              </Text>
              <TextInput
                placeholder="+2547XXXXXXXX"
                value={mpesaPhoneNumber}
                onChangeText={setMpesaPhoneNumber}
                style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          {/* Teaching Styles */}
          <View>
            <Text style={tw`text-base font-semibold text-gray-400 mb-2`}>
              Teaching Styles
            </Text>
            <View style={tw`flex-row flex-wrap gap-3`}>
              {['One-on-One', 'Group', 'Workshop', 'Lecture'].map((style) => (
                <TouchableOpacity
                  key={style}
                  onPress={() =>
                    setTeachingStyle((prev: string[]) =>
                      prev.includes(style)
                        ? prev.filter((item) => item !== style)
                        : [...prev, style]
                    )
                  }
                  style={[
                    tw`p-2 rounded-lg`,
                    teachingStyle.includes(style)
                      ? tw`bg-pink-500`
                      : tw`bg-gray-800`,
                  ]}
                >
                  <Text
                    style={
                      teachingStyle.includes(style)
                        ? tw`text-white`
                        : tw`text-gray-300`
                    }
                  >
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            placeholder="A short bio about yourself..."
            value={bio}
            onChangeText={setBio}
            style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
            placeholderTextColor="#9CA3AF"
            multiline
          />

          {/* Expertise */}
          <View>
            <Text style={tw`text-base font-semibold text-gray-400 mb-2`}>
              Expertise
            </Text>
            <View style={tw`flex-row flex-wrap gap-3`}>
              {['Exam Prep', 'Skill Building', 'Homework Help', 'Career Guidance'].map(
                (skill) => (
                  <TouchableOpacity
                    key={skill}
                    onPress={() =>
                      setExpertise((prev: string[]) =>
                        prev.includes(skill)
                          ? prev.filter((item) => item !== skill)
                          : [...prev, skill]
                      )
                    }
                    style={[
                      tw`p-2 rounded-lg`,
                      expertise.includes(skill)
                        ? tw`bg-pink-500`
                        : tw`bg-gray-800`,
                    ]}
                  >
                    <Text
                      style={
                        expertise.includes(skill)
                          ? tw`text-white`
                          : tw`text-gray-300`
                      }
                    >
                      {skill}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          {/* Pricing */}
          <View style={tw`space-y-4`}>
            <Text style={tw`text-base text-gray-400`}>
              Set Your Rates (Tokens per Session @10Shs/Token)
            </Text>
            <View style={tw`grid gap-4 sm:grid-cols-2`}>
              {pricingFields.map((field) => {
                const tokenRanges: Record<PricingKeys, { min: number; max: number }> = {
                  privateSession: { min: 20, max: 150 },
                  groupSession: { min: 15, max: 80 },
                  workshop: { min: 15, max: 200 },
                  lecture: { min: 10, max: 50 },
                };
                const { min, max } = tokenRanges[field];
                return (
                  <View key={field} style={tw`flex flex-col`}>
                    <Text style={tw`text-sm text-gray-300`}>
                      {field.replace(/([A-Z])/g, ' $1')} (Min: {min} | Max: {max})
                    </Text>
                    <TextInput
                      placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1')} Tokens`}
                      value={(pricing as Record<PricingKeys, string>)[field] || ''}
                      onChangeText={(text) => handlePricingChange(field, text)}
                      style={tw`p-2 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-sm`}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Upload Profile Images */}
          <View style={tw`space-y-2`}>
            <Text style={tw`text-base text-gray-400`}>Upload Profile Images</Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  style={tw`w-20 h-20 border flex items-center justify-center`}
                  onPress={() => {
                    // Use Expo's ImagePicker to upload an image
                  }}
                >
                  {image ? (
                    <Image
                      // Cast image as unknown first to satisfy the conversion to { uri: string }
                      source={{ uri: (image as unknown as { uri: string }).uri }}
                      style={tw`w-full h-full`}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={tw`text-gray-400 text-xs`}>Upload</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Introduction Video */}
          <View style={tw`space-y-2`}>
            <Text style={tw`text-base text-gray-400`}>Introduction Video</Text>
            <View style={tw`flex-row items-center justify-center gap-4`}>
              {videoPreview ? (
                <View style={tw`relative w-28 h-28 bg-gray-800 rounded-lg overflow-hidden`}>
                  <Video
                    source={{ uri: videoPreview }}
                    style={tw`w-full h-full`}
                    useNativeControls
                  />
                  <TouchableOpacity
                    style={tw`absolute top-1 right-1 bg-red-500 rounded-full p-1`}
                    onPress={handleRemoveVideo}
                  >
                    <Text style={tw`text-white`}>X</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={tw`flex items-center justify-center w-28 h-28 bg-gray-800 rounded-lg`}
                  onPress={() => {
                    // Use Expo's DocumentPicker or ImagePicker for video upload
                  }}
                >
                  <Text style={tw`text-gray-400`}>Upload Video</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </>
      )}

      <TouchableOpacity
        // Provide a dummy event argument to handleSubmit
        onPress={() => handleSubmit({} as React.FormEvent)}
        style={tw`w-full bg-pink-500 py-3 rounded-lg`}
        disabled={loading}
      >
        <Text style={tw`text-white text-center text-base`}>
          {loading ? 'Creating Profile...' : 'Create Profile'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default CreateProfileFormNative;
