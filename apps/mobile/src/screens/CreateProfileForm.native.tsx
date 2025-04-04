// /apps/mobile/src/screens/CreateProfileForm.native.tsx
import React from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { useProfileForm } from '@shared/hooks';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';

type PricingKey = "privateSession" | "groupSession" | "workshop" | "lecture";

const CreateProfileForm = () => {
  const navigation = useNavigation();
  
  // Pass a callback that navigates to 'Home' via navigation.navigate
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
  } = useProfileForm(() => navigation.navigate('Home'));

  return (
    <ScrollView contentContainerStyle={tw`p-4 bg-gray-900`}>
      <Text style={tw`text-2xl font-bold text-pink-400 text-center mb-4`}>Create Your Profile</Text>

      {role ? (
        <View style={tw`mb-4`}>
          <Text style={tw`text-base text-gray-400`}>Your Role</Text>
          <Text style={tw`p-3 rounded bg-gray-800 text-white text-base`}>{role}</Text>
        </View>
      ) : (
        <Text style={tw`text-gray-400 mb-4`}>Fetching your role...</Text>
      )}

      <TextInput
        placeholder="Your Name"
        value={name}
        onChangeText={setName}
        style={tw`w-full p-3 rounded bg-gray-800 text-white mb-4`}
        placeholderTextColor="#ccc"
      />
      <TextInput
        placeholder={`Age (${role === 'tutor' ? '18+' : '5+'})`}
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        style={tw`w-full p-3 rounded bg-gray-800 text-white mb-4`}
      />

      {/* Languages */}
      <Text style={tw`text-base text-gray-400 mb-2`}>Select Languages You Speak</Text>
      <View style={tw`flex-row flex-wrap mb-4`}>
        {Object.keys(languages).map((language) => (
          <TouchableOpacity
            key={language}
            onPress={() => handleLanguageSelect(language)}
            style={tw.style(
              "p-2 rounded border m-1",
              languages[language] ? "bg-pink-500" : "bg-gray-800"
            )}
          >
            <Text style={tw`text-white`}>{language}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {role === 'student' && (
        <>
          <Text style={tw`text-base text-gray-400 mb-2`}>Age Group</Text>
          <View style={tw`flex-row flex-wrap mb-4`}>
            {['Pre-Primary', 'Lower Primary', 'Upper Primary', 'University/College', 'Adults'].map((group) => (
              <TouchableOpacity
                key={group}
                onPress={() => handleAgeGroupChange(group)}
                style={tw.style(
                  "p-2 rounded-lg m-1",
                  ageGroup.includes(group) ? "bg-pink-500" : "bg-gray-800"
                )}
              >
                <Text style={tw`text-white`}>{group}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {role === 'tutor' && (
        <>
          <Text style={tw`text-base text-gray-400 mb-2`}>Subject or Skill Category</Text>
          <TextInput
            placeholder="Category"
            value={category}
            onChangeText={setCategory}
            style={tw`w-full p-3 rounded bg-gray-800 text-white mb-4`}
          />
          <Text style={tw`text-base text-gray-400 mb-2`}>Payment Method (bank/mpesa)</Text>
          <TextInput
            placeholder="Payment Method"
            value={paymentMethod}
            onChangeText={setPaymentMethod}
            style={tw`w-full p-3 rounded bg-gray-800 text-white mb-4`}
          />
          {paymentMethod === 'bank' && (
            <>
              <TextInput
                placeholder="Bank Account Number"
                value={bankAccount}
                onChangeText={setBankAccount}
                style={tw`w-full p-3 rounded bg-gray-800 text-white mb-4`}
              />
              <TextInput
                placeholder="Bank Code"
                value={bankCode}
                onChangeText={setBankCode}
                style={tw`w-full p-3 rounded bg-gray-800 text-white mb-4`}
              />
            </>
          )}
          {paymentMethod === 'mpesa' && (
            <TextInput
              placeholder="M-Pesa Phone Number"
              value={mpesaPhoneNumber}
              onChangeText={setMpesaPhoneNumber}
              style={tw`w-full p-3 rounded bg-gray-800 text-white mb-4`}
            />
          )}
          <Text style={tw`text-base text-gray-400 mb-2`}>Teaching Styles</Text>
          <View style={tw`flex-row flex-wrap mb-4`}>
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
                style={tw.style(
                  "p-2 rounded-lg m-1",
                  teachingStyle.includes(style) ? "bg-pink-500" : "bg-gray-800"
                )}
              >
                <Text style={tw`text-white`}>{style}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            placeholder="A short bio about yourself..."
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            style={tw`w-full p-3 rounded bg-gray-800 text-white mb-4`}
          />
          <Text style={tw`text-base text-gray-400 mb-2`}>Expertise</Text>
          <View style={tw`flex-row flex-wrap mb-4`}>
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
                style={tw.style(
                  "p-2 rounded-lg m-1",
                  expertise.includes(skill) ? "bg-pink-500" : "bg-gray-800"
                )}
              >
                <Text style={tw`text-white`}>{skill}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={tw`text-base text-gray-400 mb-2`}>Set Your Rates</Text>
          <View style={tw`mb-4`}>
            {['privateSession', 'groupSession', 'workshop', 'lecture'].map((field) => {
              const tokenRanges: { [key in PricingKey]: { min: number; max: number } } = {
                privateSession: { min: 20, max: 150 },
                groupSession: { min: 15, max: 80 },
                workshop: { min: 15, max: 200 },
                lecture: { min: 10, max: 50 },
              };
              const { min, max } = tokenRanges[field as PricingKey];
              return (
                <View key={field} style={tw`mb-2`}>
                  <Text style={tw`text-sm text-gray-300`}>
                    {field.replace(/([A-Z])/g, ' $1')} (Min: {min} | Max: {max})
                  </Text>
                  <TextInput
                    placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1')} Tokens`}
                    value={pricing[field as PricingKey]}
                    onChangeText={(value) =>
                      handlePricingChange(field as PricingKey, value)
                    }
                    keyboardType="numeric"
                    style={tw`p-2 rounded bg-gray-800 text-gray-300`}
                  />
                </View>
              );
            })}
          </View>
          <Text style={tw`text-base text-gray-400 mb-2`}>Upload Profile Images</Text>
          <View style={tw`flex-row flex-wrap mb-4`}>
            {images.map((image, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  // Integrate your native image picker here.
                }}
                style={tw`w-20 h-20 m-1 border flex items-center justify-center`}
              >
                {image ? (
                  <Image source={{ uri: (image as any).uri }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={tw`text-white`}>Upload</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={tw`text-base text-gray-400 mb-2`}>Introduction Video</Text>
          <View style={tw`mb-4`}>
            {videoPreview ? (
              <View style={tw`relative`}>
                <Text style={tw`text-white`}>Video Preview</Text>
                <Button title="Remove Video" onPress={handleRemoveVideo} />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  // Integrate your native video picker here.
                }}
                style={tw`p-4 bg-gray-800 rounded-lg`}
              >
                <Text style={tw`text-white`}>Upload Video</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      <TouchableOpacity
        onPress={() => handleSubmit({} as any)}
        disabled={loading}
        style={tw`w-full bg-pink-500 py-3 rounded-lg items-center mb-8`}
      >
        <Text style={tw`text-white text-base`}>
          {loading ? 'Creating Profile...' : 'Create Profile'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default CreateProfileForm;
