/* eslint-disable prettier/prettier */
import { ScrollView, View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { Video } from 'expo-av';
import { useProfileForm } from '@mytutorapp/shared/hooks';

type RootStackParamList = {
  Home: undefined;
};

type PricingKeys = 'privateSession' | 'groupSession' | 'workshop' | 'lecture';
const pricingFields: PricingKeys[] = ['privateSession', 'groupSession', 'workshop', 'lecture'];

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

  return (
    <ScrollView
      className="flex-1 bg-gray-900 p-4"
      contentContainerClassName="space-y-6 rounded-lg shadow-lg mx-auto relative"
    >
      <Text className="text-2xl font-bold text-pink-400 text-center">Create Your Profile</Text>

      {role ? (
        <View className="space-y-2">
          <Text className="text-base text-gray-400">Your Role</Text>
          <Text className="w-full p-3 rounded bg-gray-800 text-white text-base">{role}</Text>
        </View>
      ) : (
        <Text className="text-gray-400">Fetching your role...</Text>
      )}

      <TextInput
        placeholder="Your Name"
        value={name}
        onChangeText={setName}
        className="w-full p-3 rounded bg-gray-800 text-white text-base"
        placeholderTextColor="#9CA3AF"
      />

      <TextInput
        placeholder={`Age (${role === 'tutor' ? '18+' : '5+'})`}
        value={age}
        onChangeText={setAge}
        className="w-full p-3 rounded bg-gray-800 text-white text-base"
        keyboardType="numeric"
        placeholderTextColor="#9CA3AF"
      />

      {/* Languages */}
      <View className="space-y-2 mt-4">
        <Text className="text-base text-gray-400">Select Languages You Speak</Text>
        <View className="flex-row flex-wrap gap-2">
          {Object.keys(languages).map((language) => (
            <TouchableOpacity
              key={language}
              onPress={() => handleLanguageSelect(language)}
              className={`px-3 py-1 rounded ${languages[language] ? 'bg-pink-500' : 'bg-gray-800'}`}
            >
              <Text className={languages[language] ? 'text-white' : 'text-gray-400'}>
                {language}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Student fields */}
      {role === 'student' && (
        <>
          <Text className="text-base font-semibold text-gray-400 mt-4">Age Group</Text>
          <View className="flex-row flex-wrap gap-2">
            {['Pre-Primary', 'Lower Primary', 'Upper Primary', 'University/College', 'Adults'].map(
              (group) => (
                <TouchableOpacity
                  key={group}
                  onPress={() => handleAgeGroupChange(group)}
                  className={`px-3 py-1 rounded ${
                    ageGroup.includes(group) ? 'bg-pink-500' : 'bg-gray-800'
                  }`}
                >
                  <Text className={ageGroup.includes(group) ? 'text-white' : 'text-gray-400'}>
                    {group}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        </>
      )}

      {/* Tutor fields */}
      {role === 'tutor' && (
        <>
          <View className="space-y-2">
            <Text className="text-base text-gray-400">Select Subject or Skill Category</Text>
            <TextInput
              placeholder="Select a category"
              value={category}
              onChangeText={setCategory}
              className="w-full p-3 rounded bg-gray-800 text-white text-base"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View className="space-y-2">
            <Text className="text-base text-gray-400">Payment Method</Text>
            <TextInput
              placeholder="Select payment method"
              value={paymentMethod}
              onChangeText={setPaymentMethod}
              className="w-full p-3 rounded bg-gray-800 text-white text-base"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {paymentMethod === 'bank' && (
            <View className="space-y-2">
              <Text className="text-base text-gray-400">Bank Account Details</Text>
              <TextInput
                placeholder="Enter your Bank Account Number"
                value={bankAccount}
                onChangeText={setBankAccount}
                className="w-full p-3 rounded bg-gray-800 text-white text-base"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          {paymentMethod === 'bank' && (
            <View className="space-y-2">
              <Text className="text-base text-gray-400">Bank Code</Text>
              <TextInput
                placeholder="Enter your Bank Code"
                value={bankCode}
                onChangeText={setBankCode}
                className="w-full p-3 rounded bg-gray-800 text-white text-base"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          {paymentMethod === 'mpesa' && (
            <View className="space-y-2">
              <Text className="text-base text-gray-400">M-Pesa Phone Number</Text>
              <TextInput
                placeholder="+2547XXXXXXXX"
                value={mpesaPhoneNumber}
                onChangeText={setMpesaPhoneNumber}
                className="w-full p-3 rounded bg-gray-800 text-white text-base"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          )}

          <View>
            <Text className="text-base font-semibold text-gray-400 mb-2">Teaching Styles</Text>
            <View className="flex-row flex-wrap gap-2">
              {['One-on-One', 'Group', 'Workshop', 'Lecture'].map((style) => (
                <TouchableOpacity
                  key={style}
                  onPress={() =>
                    setTeachingStyle((prev) =>
                      prev.includes(style)
                        ? prev.filter((item) => item !== style)
                        : [...prev, style],
                    )
                  }
                  className={`px-3 py-1 rounded ${
                    teachingStyle.includes(style) ? 'bg-pink-500' : 'bg-gray-800'
                  }`}
                >
                  <Text className={teachingStyle.includes(style) ? 'text-white' : 'text-gray-400'}>
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
            className="w-full p-3 rounded bg-gray-800 text-white text-base"
            placeholderTextColor="#9CA3AF"
            multiline
          />

          <View>
            <Text className="text-base font-semibold text-gray-400 mb-2">Expertise</Text>
            <View className="flex-row flex-wrap gap-2">
              {['Exam Prep', 'Skill Building', 'Homework Help', 'Career Guidance'].map((skill) => (
                <TouchableOpacity
                  key={skill}
                  onPress={() =>
                    setExpertise((prev) =>
                      prev.includes(skill)
                        ? prev.filter((item) => item !== skill)
                        : [...prev, skill],
                    )
                  }
                  className={`px-3 py-1 rounded ${
                    expertise.includes(skill) ? 'bg-pink-500' : 'bg-gray-800'
                  }`}
                >
                  <Text className={expertise.includes(skill) ? 'text-white' : 'text-gray-400'}>
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="space-y-4">
            <Text className="text-base text-gray-400">
              Set Your Rates (Tokens per Session @10Shs/Token)
            </Text>
            <View className="flex-row flex-wrap -mx-2">
              {pricingFields.map((field) => {
                const tokenRanges: Record<PricingKeys, { min: number; max: number }> = {
                  privateSession: { min: 20, max: 150 },
                  groupSession: { min: 15, max: 80 },
                  workshop: { min: 15, max: 200 },
                  lecture: { min: 10, max: 50 },
                };
                const { min, max } = tokenRanges[field];
                return (
                  <View key={field} className="w-1/2 px-2 mb-4">
                    <Text className="text-sm text-gray-300">
                      {field.replace(/([A-Z])/g, ' $1')} (Min: {min} | Max: {max})
                    </Text>
                    <TextInput
                      placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1')} Tokens`}
                      value={(pricing as Record<PricingKeys, string>)[field] || ''}
                      onChangeText={(text) => handlePricingChange(field, text)}
                      className="p-2 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-sm"
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                );
              })}
            </View>
          </View>

          <View className="space-y-2">
            <Text className="text-base text-gray-400">Upload Profile Images</Text>
            <View className="flex-row flex-wrap gap-2">
              {images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  className="w-20 h-20 border flex items-center justify-center"
                  onPress={() => {
                    /* image picker handler */
                  }}
                >
                  {image ? (
                    <Image
                      source={{ uri: (image as unknown as { uri: string }).uri }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-gray-400 text-xs">Upload</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="space-y-2">
            <Text className="text-base text-gray-400">Introduction Video</Text>
            <View className="flex-row items-center justify-center gap-4">
              {videoPreview ? (
                <View className="relative w-28 h-28 bg-gray-800 rounded-lg overflow-hidden">
                  <Video
                    source={{ uri: videoPreview }}
                    className="w-full h-full"
                    useNativeControls
                  />
                  <TouchableOpacity
                    className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                    onPress={handleRemoveVideo}
                  >
                    <Text className="text-white">X</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  className="flex items-center justify-center w-28 h-28 bg-gray-800 rounded-lg"
                  onPress={() => {
                    /* video picker handler */
                  }}
                >
                  <Text className="text-gray-400">Upload Video</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </>
      )}

      <TouchableOpacity
        onPress={() => handleSubmit({} as React.FormEvent)}
        className="w-full bg-pink-500 py-3 rounded-lg"
        disabled={loading}
      >
        <Text className="text-white text-center text-base">
          {loading ? 'Creating Profile...' : 'Create Profile'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default CreateProfileFormNative;
