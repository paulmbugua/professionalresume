/* eslint-disable prettier/prettier */
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
import { useProfileForm } from '@mytutorapp/shared/hooks';
import tw from '../../tailwind';

type RootStackParamList = {
  Home: undefined;
};

type PricingKeys = 'privateSession' | 'groupSession' | 'workshop' | 'lecture';
const pricingFields: PricingKeys[] = [
  'privateSession',
  'groupSession',
  'workshop',
  'lecture',
];

const CreateProfileFormNative: React.FC = () => {
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
    handlePricingChange,
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

  const tokenRanges: Record<PricingKeys, { min: number; max: number }> = {
    privateSession: { min: 20, max: 150 },
    groupSession: { min: 15, max: 80 },
    workshop: { min: 15, max: 200 },
    lecture: { min: 10, max: 50 },
  };

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
        placeholderTextColor="#9CA3AF"
        style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
      />

      <TextInput
        placeholder={`Age (${role === 'tutor' ? '18+' : '5+'})`}
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        placeholderTextColor="#9CA3AF"
        style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
      />

      {/* Languages */}
      <View style={tw`space-y-2 mt-4`}>
        <Text style={tw`text-base text-gray-400`}>Select Languages You Speak</Text>
        <View style={tw`flex-row flex-wrap gap-2`}>
          {Object.keys(languages).map((language) => (
            <TouchableOpacity
              key={language}
              onPress={() => handleLanguageSelect(language)}
              style={[
                tw`px-3 py-1 rounded`,
                languages[language] ? tw`bg-pink-500` : tw`bg-gray-800`,
              ]}
            >
              <Text
                style={
                  languages[language] ? tw`text-white` : tw`text-gray-400`
                }
              >
                {language}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Student fields */}
      {role === 'student' && (
        <>
          <Text style={tw`text-base font-semibold text-gray-400 mt-4`}>
            Age Group
          </Text>
          <View style={tw`flex-row flex-wrap gap-2`}>
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
                  tw`px-3 py-1 rounded`,
                  ageGroup.includes(group)
                    ? tw`bg-pink-500`
                    : tw`bg-gray-800`,
                ]}
              >
                <Text
                  style={
                    ageGroup.includes(group)
                      ? tw`text-white`
                      : tw`text-gray-400`
                  }
                >
                  {group}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Tutor fields */}
      {role === 'tutor' && (
        <>
          <View style={tw`space-y-2`}>
            <Text style={tw`text-base text-gray-400`}>
              Select Subject or Skill Category
            </Text>
            <TextInput
              placeholder="Select a category"
              value={category}
              onChangeText={setCategory}
              placeholderTextColor="#9CA3AF"
              style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
            />
          </View>

          <View style={tw`space-y-2`}>
            <Text style={tw`text-base text-gray-400`}>Payment Method</Text>
            <TextInput
              placeholder="Select payment method"
              value={paymentMethod}
              onChangeText={setPaymentMethod}
              placeholderTextColor="#9CA3AF"
              style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
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
                placeholderTextColor="#9CA3AF"
                style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
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
                placeholderTextColor="#9CA3AF"
                style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
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
                placeholderTextColor="#9CA3AF"
                style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
              />
            </View>
          )}

          <View>
            <Text style={tw`text-base font-semibold text-gray-400 mb-2`}>
              Teaching Styles
            </Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {['One-on-One', 'Group', 'Workshop', 'Lecture'].map((style) => (
                <TouchableOpacity
                  key={style}
                  onPress={() =>
                    setTeachingStyle((prev) =>
                      prev.includes(style)
                        ? prev.filter((item) => item !== style)
                        : [...prev, style]
                    )
                  }
                  style={[
                    tw`px-3 py-1 rounded`,
                    teachingStyle.includes(style)
                      ? tw`bg-pink-500`
                      : tw`bg-gray-800`,
                  ]}
                >
                  <Text
                    style={
                      teachingStyle.includes(style)
                        ? tw`text-white`
                        : tw`text-gray-400`
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
            placeholderTextColor="#9CA3AF"
            multiline
            style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
          />

          <View>
            <Text style={tw`text-base font-semibold text-gray-400 mb-2`}>
              Expertise
            </Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {[
                'Exam Prep',
                'Skill Building',
                'Homework Help',
                'Career Guidance',
              ].map((skill) => (
                <TouchableOpacity
                  key={skill}
                  onPress={() =>
                    setExpertise((prev) =>
                      prev.includes(skill)
                        ? prev.filter((item) => item !== skill)
                        : [...prev, skill]
                    )
                  }
                  style={[
                    tw`px-3 py-1 rounded`,
                    expertise.includes(skill)
                      ? tw`bg-pink-500`
                      : tw`bg-gray-800`,
                  ]}
                >
                  <Text
                    style={
                      expertise.includes(skill)
                        ? tw`text-white`
                        : tw`text-gray-400`
                    }
                  >
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={tw`space-y-4`}>
            <Text style={tw`text-base text-gray-400`}>
              Set Your Rates (Tokens per Session @10Shs/Token)
            </Text>
            <View style={tw`flex-row flex-wrap -mx-2`}>
              {pricingFields.map((field) => {
                const { min, max } = tokenRanges[field];
                return (
                  <View key={field} style={tw`w-1/2 px-2 mb-4`}>
                    <Text style={tw`text-sm text-gray-300`}>
                      {field.replace(/([A-Z])/g, ' $1')} (Min: {min} | Max: {max})
                    </Text>
                    <TextInput
                      placeholder={`Enter ${
                        field.replace(/([A-Z])/g, ' $1')
                      } Tokens`}
                      value={(pricing as Record<PricingKeys, string>)[field] || ''}
                      onChangeText={(text) => handlePricingChange(field, text)}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                      style={tw`p-2 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-sm`}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          <View style={tw`space-y-2`}>
            <Text style={tw`text-base text-gray-400`}>
              Upload Profile Images
            </Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    /* image picker handler */
                  }}
                  style={tw`w-20 h-20 border flex items-center justify-center`}
                >
                  {image ? (
                    <Image
                      source={{
                        uri: (image as unknown as { uri: string }).uri,
                      }}
                      resizeMode="cover"
                      style={tw`w-full h-full`}
                    />
                  ) : (
                    <Text style={tw`text-gray-400 text-xs`}>Upload</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={tw`space-y-2`}>
            <Text style={tw`text-base text-gray-400`}>Introduction Video</Text>
            <View style={tw`flex-row items-center justify-center gap-4`}>
              {videoPreview ? (
                <View style={tw`relative w-28 h-28 bg-gray-800 rounded-lg overflow-hidden`}>
                  <Video
                    source={{ uri: videoPreview }}
                    useNativeControls
                    style={tw`w-full h-full`}
                  />
                  <TouchableOpacity
                    onPress={handleRemoveVideo}
                    style={tw`absolute top-1 right-1 bg-red-500 rounded-full p-1`}
                  >
                    <Text style={tw`text-white`}>X</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    /* video picker handler */
                  }}
                  style={tw`flex items-center justify-center w-28 h-28 bg-gray-800 rounded-lg`}
                >
                  <Text style={tw`text-gray-400`}>Upload Video</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </>
      )}

      <TouchableOpacity
        onPress={() => handleSubmit({} as React.FormEvent)}
        disabled={loading}
        style={tw`w-full bg-pink-500 py-3 rounded-lg`}
      >
        <Text style={tw`text-white text-center text-base`}>
          {loading ? 'Creating Profile...' : 'Create Profile'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default CreateProfileFormNative;
