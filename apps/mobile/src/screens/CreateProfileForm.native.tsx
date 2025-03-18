// /apps/mobile/src/screens/CreateProfileForm.native.tsx
import React from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Image, Button } from 'react-native';
import { useProfileForm } from '@shared/hooks/useProfileForm';
import { useSafeNavigate } from "@shared/utils/navigation";

type PricingKey = "privateSession" | "groupSession" | "workshop" | "lecture";

const CreateProfileForm = () => {
  // Assume useSafeNavigate returns a callable navigation function.
  const navigation = useSafeNavigate();
  // Pass a callback that calls navigation('Home') directly.
  const {
    role,
    name, setName,
    age, setAge,
    languages,
    handleLanguageSelect,
    ageGroup,
    handleAgeGroupChange,
    category, setCategory,
    bio, setBio,
    expertise, setExpertise,
    teachingStyle, setTeachingStyle,
    pricing,
    handlePricingChange,
    paymentMethod, setPaymentMethod,
    bankAccount, setBankAccount,
    bankCode, setBankCode,
    mpesaPhoneNumber, setMpesaPhoneNumber,
    images, setImages,
    video,
    videoPreview,
    handleVideoChange,
    handleRemoveVideo,
    loading,
    handleSubmit,
  } = useProfileForm(() => navigation('Home'));

  return (
    <ScrollView className="p-4 bg-gray-900">
      <Text className="text-2xl font-bold text-pink-400 text-center mb-4">Create Your Profile</Text>

      {role ? (
        <View className="mb-4">
          <Text className="text-base text-gray-400">Your Role</Text>
          <Text className="p-3 rounded bg-gray-800 text-white text-base">{role}</Text>
        </View>
      ) : (
        <Text className="text-gray-400 mb-4">Fetching your role...</Text>
      )}

      <TextInput
        placeholder="Your Name"
        value={name}
        onChangeText={setName}
        className="w-full p-3 rounded bg-gray-800 text-white mb-4"
      />
      <TextInput
        placeholder={`Age (${role === 'tutor' ? '18+' : '5+'})`}
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        className="w-full p-3 rounded bg-gray-800 text-white mb-4"
      />

      {/* Languages */}
      <Text className="text-base text-gray-400 mb-2">Select Languages You Speak</Text>
      <View className="flex-row flex-wrap mb-4">
        {Object.keys(languages).map((language) => (
          <TouchableOpacity
            key={language}
            onPress={() => handleLanguageSelect(language)}
            className={`p-2 rounded border m-1 ${languages[language] ? 'bg-pink-500' : 'bg-gray-800'}`}
          >
            <Text className="text-white">{language}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {role === 'student' && (
        <>
          <Text className="text-base text-gray-400 mb-2">Age Group</Text>
          <View className="flex-row flex-wrap mb-4">
            {['Pre-Primary', 'Lower Primary', 'Upper Primary', 'University/College', 'Adults'].map((group) => (
              <TouchableOpacity
                key={group}
                onPress={() => handleAgeGroupChange(group)}
                className={`p-2 rounded-lg m-1 ${ageGroup.includes(group) ? 'bg-pink-500' : 'bg-gray-800'}`}
              >
                <Text className="text-white">{group}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {role === 'tutor' && (
        <>
          <Text className="text-base text-gray-400 mb-2">Subject or Skill Category</Text>
          <TextInput
            placeholder="Category"
            value={category}
            onChangeText={setCategory}
            className="w-full p-3 rounded bg-gray-800 text-white mb-4"
          />
          <Text className="text-base text-gray-400 mb-2">Payment Method (bank/mpesa)</Text>
          <TextInput
            placeholder="Payment Method"
            value={paymentMethod}
            onChangeText={setPaymentMethod}
            className="w-full p-3 rounded bg-gray-800 text-white mb-4"
          />
          {paymentMethod === 'bank' && (
            <>
              <TextInput
                placeholder="Bank Account Number"
                value={bankAccount}
                onChangeText={setBankAccount}
                className="w-full p-3 rounded bg-gray-800 text-white mb-4"
              />
              <TextInput
                placeholder="Bank Code"
                value={bankCode}
                onChangeText={setBankCode}
                className="w-full p-3 rounded bg-gray-800 text-white mb-4"
              />
            </>
          )}
          {paymentMethod === 'mpesa' && (
            <TextInput
              placeholder="M-Pesa Phone Number"
              value={mpesaPhoneNumber}
              onChangeText={setMpesaPhoneNumber}
              className="w-full p-3 rounded bg-gray-800 text-white mb-4"
            />
          )}
          <Text className="text-base text-gray-400 mb-2">Teaching Styles</Text>
          <View className="flex-row flex-wrap mb-4">
            {['One-on-One', 'Group', 'Workshop', 'Lecture'].map((style) => (
              <TouchableOpacity
                key={style}
                onPress={() => {
                  if (teachingStyle.includes(style)) {
                    setTeachingStyle(prev => prev.filter(item => item !== style));
                  } else {
                    setTeachingStyle(prev => [...prev, style]);
                  }
                }}
                className={`p-2 rounded-lg m-1 ${teachingStyle.includes(style) ? 'bg-pink-500' : 'bg-gray-800'}`}
              >
                <Text className="text-white">{style}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            placeholder="A short bio about yourself..."
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            className="w-full p-3 rounded bg-gray-800 text-white mb-4"
          />
          <Text className="text-base text-gray-400 mb-2">Expertise</Text>
          <View className="flex-row flex-wrap mb-4">
            {['Exam Prep', 'Skill Building', 'Homework Help', 'Career Guidance'].map((skill) => (
              <TouchableOpacity
                key={skill}
                onPress={() => {
                  if (expertise.includes(skill)) {
                    setExpertise(prev => prev.filter(item => item !== skill));
                  } else {
                    setExpertise(prev => [...prev, skill]);
                  }
                }}
                className={`p-2 rounded-lg m-1 ${expertise.includes(skill) ? 'bg-pink-500' : 'bg-gray-800'}`}
              >
                <Text className="text-white">{skill}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-base text-gray-400 mb-2">Set Your Rates</Text>
          <View className="mb-4">
            {['privateSession', 'groupSession', 'workshop', 'lecture'].map((field) => {
              const tokenRanges: { [key in PricingKey]: { min: number; max: number } } = {
                privateSession: { min: 20, max: 150 },
                groupSession: { min: 15, max: 80 },
                workshop: { min: 15, max: 200 },
                lecture: { min: 10, max: 50 },
              };
              const { min, max } = tokenRanges[field as PricingKey];
              return (
                <View key={field} className="mb-2">
                  <Text className="text-sm text-gray-300">
                    {field.replace(/([A-Z])/g, ' $1')} (Min: {min} | Max: {max})
                  </Text>
                  <TextInput
                    placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1')} Tokens`}
                    value={pricing[field as PricingKey]}
                    onChangeText={(value) =>
                      handlePricingChange(field as PricingKey, value)
                    }
                    keyboardType="numeric"
                    className="p-2 rounded-lg bg-gray-800 text-gray-300"
                  />
                </View>
              );
            })}
          </View>
          <Text className="text-base text-gray-400 mb-2">Upload Profile Images</Text>
          <View className="flex-row flex-wrap mb-4">
            {images.map((image, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  // Integrate your native image picker here.
                }}
                className="w-20 h-20 m-1 border flex items-center justify-center"
              >
                {image ? (
                  <Image source={{ uri: (image as any).uri }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text className="text-white">Upload</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text className="text-base text-gray-400 mb-2">Introduction Video</Text>
          <View className="mb-4">
            {videoPreview ? (
              <View className="relative">
                <Text className="text-white">Video Preview</Text>
                <Button title="Remove Video" onPress={handleRemoveVideo} />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  // Integrate your native video picker here.
                }}
                className="p-4 bg-gray-800 rounded-lg"
              >
                <Text className="text-white">Upload Video</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      <TouchableOpacity
        onPress={() => handleSubmit({} as any)}
        disabled={loading}
        className="w-full bg-pink-500 py-3 rounded-lg items-center mb-8"
      >
        <Text className="text-white text-base">
          {loading ? 'Creating Profile...' : 'Create Profile'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default CreateProfileForm;
