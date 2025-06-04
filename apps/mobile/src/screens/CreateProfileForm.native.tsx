/* eslint-disable prettier/prettier */
import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useProfileForm } from '@mytutorapp/shared/hooks';
import tw from '../../tailwind';

// Local, minimal upload‐agnostic type
interface UploadAsset {
  uri: string;
  name?: string;
  type?: string;
}

type RootStackParamList = { Home: undefined };
type PricingKeys = 'privateSession' | 'groupSession' | 'workshop' | 'lecture';
const pricingFields: PricingKeys[] = [
  'privateSession',
  'groupSession',
  'workshop',
  'lecture',
];

export default function CreateProfileFormNative() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {
    role,
    name, setName,
    age, setAge,
    bio, setBio,
    languages, handleLanguageSelect,
    ageGroup, handleAgeGroupChange,
    category, setCategory,
    paymentMethod, setPaymentMethod,
    bankAccount, setBankAccount,
    bankCode, setBankCode,
    mpesaPhoneNumber, setMpesaPhoneNumber,
    teachingStyle, setTeachingStyle,
    expertise, setExpertise,
    pricing, handlePricingChange,
    images, setImages,
    videoPreview,
    handleVideoChange, handleRemoveVideo,
    loading, handleSubmit,
  } = useProfileForm({ onSuccess: () => navigation.navigate('Home') });

  const tokenRanges: Record<PricingKeys, { min: number; max: number }> = {
    privateSession: { min: 20, max: 150 },
    groupSession:   { min: 15, max: 80  },
    workshop:       { min: 15, max: 200 },
    lecture:        { min: 10, max: 50  },
  };

  const isUploadAsset = (obj: any): obj is UploadAsset =>
  obj && typeof obj.uri === 'string';


  // Single-image picker
  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      return Alert.alert('Permission required','We need access to your photos.');
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.length) {
      const asset = res.assets[0];
      if (!asset) return; // guard for TS
      const upload: UploadAsset = {
        uri: asset.uri,
        name: asset.fileName ?? undefined,
        type: asset.type,
      };
      setImages([upload, null, null, null]);
    }
  };

  // Single-video picker
  const pickVideo = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      return Alert.alert('Permission required','We need access to your videos.');
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    });
    if (!res.canceled && res.assets?.length) {
      const asset = res.assets[0];
      if (!asset) return; // guard for TS
      const upload: UploadAsset = {
        uri: asset.uri,
        name: asset.fileName ?? undefined,
        type: asset.type,
      };
      handleVideoChange(upload);
    }
  };

  return (
    <ScrollView
      style={tw`flex-1 bg-gray-900`}
      contentContainerStyle={tw`p-4 pb-10 gap-6`}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={tw`text-2xl font-bold text-pink-400 text-center`}>
        Create Your Profile
      </Text>

      {role ? (
        <View style={tw`gap-2`}>
          <Text style={tw`text-base text-gray-400`}>Your Role</Text>
          <Text style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}>
            {role}
          </Text>
        </View>
      ) : (
        <Text style={tw`text-gray-400`}>Fetching your role…</Text>
      )}

      {/* Name */}
      <View style={tw`gap-2`}>
        <Text style={tw`text-base text-gray-400`}>Your Name</Text>
        <TextInput
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#9CA3AF"
          style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
        />
      </View>

      {/* Age */}
      <TextInput
        placeholder={`Age (${role === 'tutor' ? '18+' : '5+'})`}
        value={age}
        onChangeText={setAge}
        keyboardType="numeric"
        placeholderTextColor="#9CA3AF"
        style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
      />

      {/* Bio (tutors only) */}
    {role === 'tutor' && (
      <View style={tw`gap-2`}>
        <Text style={tw`text-base text-gray-400 mb-1`}>Bio</Text>
        <TextInput
          placeholder="A short bio about yourself…"
          value={bio}
          onChangeText={setBio}
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={tw`w-full h-24 p-3 rounded bg-gray-800 text-white text-base`}
        />
      </View>
)}

      {/* Languages */}
      <View style={tw`gap-2`}>
        <Text style={tw`text-base text-gray-400`}>Select Languages You Speak</Text>
        <View style={tw`flex-row flex-wrap gap-2`}>
          {Object.keys(languages).map(lang => (
            <TouchableOpacity
              key={lang}
              onPress={() => handleLanguageSelect(lang)}
              style={[
                tw`px-3 py-1 rounded`,
                languages[lang] ? tw`bg-pink-500` : tw`bg-gray-800`,
              ]}
            >
              <Text style={languages[lang] ? tw`text-white` : tw`text-gray-400`}>
                {lang}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Student */}
      {role === 'student' && (
        <View style={tw`gap-2`}>
          <Text style={tw`text-base font-semibold text-gray-400`}>Age Group</Text>
          <View style={tw`flex-row flex-wrap gap-2`}>
            {['Pre-Primary','Lower Primary','Upper Primary','University/College','Adults'].map(g => (
              <TouchableOpacity
                key={g}
                onPress={() => handleAgeGroupChange(g)}
                style={[
                  tw`px-3 py-1 rounded`,
                  ageGroup.includes(g) ? tw`bg-pink-500` : tw`bg-gray-800`,
                ]}
              >
                <Text style={ageGroup.includes(g) ? tw`text-white` : tw`text-gray-400`}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Tutor */}
      {role === 'tutor' && (
        <View style={tw`gap-4`}>
          {/* Category */}
          <View style={tw`gap-2`}>
            <Text style={tw`text-base text-gray-400`}>
              Select Subject or Skill Category
            </Text>
            <Picker
              selectedValue={category}
              onValueChange={setCategory}
              style={tw`bg-gray-800 rounded`}
            >
              <Picker.Item label="Select a category…" value="" />
              <Picker.Item label="Math Tutor" value="Math Tutor" />
              <Picker.Item label="Sciences"   value="Sciences"   />
              <Picker.Item label="Programming" value="Programming" />
              <Picker.Item label="Art & Design"value="Art & Design"/>
              <Picker.Item label="Languages"   value="Languages"   />
              <Picker.Item label="Wellness"    value="Wellness"    />
            </Picker>
          </View>

          {/* Payment Method */}
          <View style={tw`gap-2`}>
            <Text style={tw`text-base text-gray-400`}>Payment Method</Text>
            <Picker
              selectedValue={paymentMethod}
              onValueChange={setPaymentMethod}
              style={tw`bg-gray-800 rounded`}
            >
              <Picker.Item label="Select payment method…" value="" />
              <Picker.Item label="Bank"   value="bank"  />
              <Picker.Item label="M-Pesa" value="mpesa"/>
            </Picker>
          </View>

          {/* Bank */}
          {paymentMethod === 'bank' && (
            <View style={tw`gap-2`}>
              <Text style={tw`text-base text-gray-400`}>Bank Account Number</Text>
              <TextInput
                placeholder="Enter your Bank Account Number"
                value={bankAccount}
                onChangeText={setBankAccount}
                placeholderTextColor="#9CA3AF"
                style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
              />
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

          {/* M-Pesa */}
          {paymentMethod === 'mpesa' && (
            <View style={tw`gap-2`}>
              <Text style={tw`text-base text-gray-400`}>M-Pesa Phone Number</Text>
              <TextInput
                placeholder="+2547XXXXXXXX"
                value={mpesaPhoneNumber}
                onChangeText={setMpesaPhoneNumber}
                placeholderTextColor="#9CA3AF"
                style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
              />
            </View>
          )}

          {/* Age Groups You Teach */}
          <View style={tw`gap-2`}>
            <Text style={tw`text-base font-semibold text-gray-400`}>
              Age Groups You Teach
            </Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {[
                'Pre-Primary',
                'Lower Primary',
                'Upper Primary',
                'University/College',
                'Adults',
              ].map(group => (
                <TouchableOpacity
                  key={group}
                  onPress={() => handleAgeGroupChange(group)}
                  style={[
                    tw`px-3 py-1 rounded`,
                    ageGroup.includes(group) ? tw`bg-pink-500` : tw`bg-gray-800`,
                  ]}
                >
                  <Text style={ageGroup.includes(group) ? tw`text-white` : tw`text-gray-400`}>
                    {group}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Teaching Styles */}
          <View style={tw`gap-2`}>
            <Text style={tw`text-base font-semibold text-gray-400`}>Teaching Styles</Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {['One-on-One','Group','Workshop','Lecture'].map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() =>
                    setTeachingStyle(prev =>
                      prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s]
                    )
                  }
                  style={[
                    tw`px-3 py-1 rounded`,
                    teachingStyle.includes(s) ? tw`bg-pink-500` : tw`bg-gray-800`,
                  ]}
                >
                  <Text style={teachingStyle.includes(s) ? tw`text-white` : tw`text-gray-400`}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Expertise */}
          <View style={tw`gap-2`}>
            <Text style={tw`text-base font-semibold text-gray-400`}>Expertise</Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {['Exam Prep','Skill Building','Homework Help','Career Guidance'].map(skill => (
                <TouchableOpacity
                  key={skill}
                  onPress={() =>
                    setExpertise(prev =>
                      prev.includes(skill) ? prev.filter(i => i !== skill) : [...prev, skill]
                    )
                  }
                  style={[
                    tw`px-3 py-1 rounded`,
                    expertise.includes(skill) ? tw`bg-pink-500` : tw`bg-gray-800`,
                  ]}
                >
                  <Text style={expertise.includes(skill) ? tw`text-white` : tw`text-gray-400`}>
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Rates */}
          <View style={tw`gap-4`}>
            <Text style={tw`text-base text-gray-400`}>
              Set Your Rates (Tokens per Session @10Shs/Token)
            </Text>
            <View style={tw`flex-row flex-wrap -mx-2`}>
              {pricingFields.map(field => {
                const { min, max } = tokenRanges[field];
                return (
                  <View key={field} style={tw`w-1/2 px-2 mb-4`}>
                    <Text style={tw`text-sm text-gray-300`}>
                      {field.replace(/([A-Z])/g,' $1')} (Min: {min} | Max: {max})
                    </Text>
                    <TextInput
                      placeholder={`Enter ${field.replace(/([A-Z])/g,' $1')} Tokens`}
                      value={pricing[field]}
                      onChangeText={t => handlePricingChange(field, t)}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                      style={tw`w-full p-2 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-sm`}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Image Upload */}
          <View style={tw`gap-2`}>
            <Text style={tw`text-base text-gray-400`}>Upload Profile Image</Text>
            <TouchableOpacity
              onPress={pickImage}
              style={tw`w-24 h-24 border items-center justify-center rounded bg-gray-800`}
            >
              {images[0] && isUploadAsset(images[0]) ? (
                <Image
                  source={{ uri: images[0].uri }}
                  style={tw`w-full h-full rounded`}
                />
              ) : (
                <Text style={tw`text-gray-400 text-xs`}>Upload</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Video Upload */}
          <View style={tw`gap-2`}>
            <Text style={tw`text-base text-gray-400`}>Introduction Video</Text>
            <View style={tw`flex-col`}>
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
                  onPress={pickVideo}
                  style={tw`w-28 h-28 bg-gray-800 rounded-lg flex items-center justify-center`}
                >
                  <Text style={tw`text-gray-400`}>Upload Video</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Submit */}
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
}
