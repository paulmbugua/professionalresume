// /apps/mobile/src/screens/ManageProfileForm.native.tsx
import React from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, Image, Switch } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useManageProfileForm } from '@shared/hooks';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';
// If you have a mobile toast library, replace the below import accordingly.
import { toast } from 'react-toastify';

const ManageProfileForm = () => {
  const {
    role,
    updatedData,
    availableProfiles,
    searchResults,
    isUploading,
    handleInputChange,
    handleLanguageSelect,
    handleSearch,
    handleAddRecommendation,
    handleRemoveRecommendation,
    handlePricingChange,
    handleFileChange,
    handleDeleteImage,
    handleDeleteVideo,
    handleToggleNotifications,
    handlePaymentMethodChange,
    handlePaymentDetailsChange,
    handleAgeGroupSelect,
    handleSubmit,
    handleTeachingStyleSelect,
    setUpdatedData,
  } = useManageProfileForm();

  const navigation = useNavigation();

  return (
    <ScrollView style={tw`bg-gray-900 flex-1 p-4`}>
      <Text style={tw`text-white text-2xl font-bold mb-4`}>Manage Profile</Text>

      {/* Common Fields */}
      <TextInput
        placeholder="Name"
        value={updatedData.name}
        onChangeText={(text) =>
          setUpdatedData((prev: any) => ({ ...prev, name: text }))
        }
        style={tw`bg-gray-800 text-white p-2 rounded mb-4`}
        placeholderTextColor="#ccc"
      />
      <TextInput
        placeholder="Age"
        value={updatedData.age ? String(updatedData.age) : ''}
        onChangeText={(text) =>
          setUpdatedData((prev: any) => ({ ...prev, age: text }))
        }
        style={tw`bg-gray-800 text-white p-2 rounded mb-4`}
        keyboardType="numeric"
        placeholderTextColor="#ccc"
      />

      {/* Languages Section */}
      <View style={tw`mb-4`}>
        <Text style={tw`text-white font-semibold mb-2`}>Languages</Text>
        <View style={tw`flex-row flex-wrap`}>
          {Object.keys(updatedData.languages).map((language) => (
            <TouchableOpacity
              key={language}
              onPress={() => handleLanguageSelect(language)}
              style={tw.style(
                "p-2 rounded border m-1",
                updatedData.languages[language] ? "border-pink-500" : "border-gray-700"
              )}
            >
              <Text style={tw`text-white text-sm`}>{language}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Student-Specific Fields */}
      {role === 'student' && (
        <View style={tw`mb-4`}>
          <Text style={tw`text-white font-semibold mb-2`}>Age Groups</Text>
          <View style={tw`flex-row flex-wrap`}>
            {['Pre-Primary', 'Lower Primary', 'Upper Primary', 'University/College', 'Adults'].map((group) => (
              <TouchableOpacity
                key={group}
                onPress={() => handleAgeGroupSelect(group)}
                style={tw.style(
                  "p-2 rounded border m-1",
                  updatedData.ageGroup.includes(group) ? "border-pink-500" : "border-gray-700"
                )}
              >
                <Text style={tw`text-white text-sm`}>{group}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Tutor-Specific Fields */}
      {role === 'tutor' && (
        <>
          {/* Category */}
          <Text style={tw`text-gray-300 font-semibold mb-2`}>Category</Text>
          <Picker
            selectedValue={updatedData.category}
            onValueChange={(itemValue) =>
              setUpdatedData((prev: any) => ({ ...prev, category: itemValue }))
            }
            style={tw`bg-gray-800 text-white mb-4`}
          >
            <Picker.Item label="Select Category" value="" />
            <Picker.Item label="Math Tutor" value="Math Tutor" />
            <Picker.Item label="Sciences" value="Sciences" />
            <Picker.Item label="Programming" value="Programming" />
            <Picker.Item label="Languages" value="Languages" />
            <Picker.Item label="Art & Design" value="Art & Design" />
            <Picker.Item label="Wellness" value="Wellness" />
          </Picker>

          {/* Status */}
          <Text style={tw`text-gray-300 font-semibold mb-2`}>Status</Text>
          <Picker
            selectedValue={updatedData.status}
            onValueChange={(itemValue) =>
              setUpdatedData((prev: any) => ({ ...prev, status: itemValue }))
            }
            style={tw`bg-gray-800 text-white mb-4`}
          >
            <Picker.Item label="Online" value="Online" />
            <Picker.Item label="Offline" value="Offline" />
            <Picker.Item label="Busy" value="Busy" />
            <Picker.Item label="Free Session" value="Free" />
          </Picker>

          {/* Notifications */}
          <View style={tw`flex-row items-center mb-4`}>
            <Text style={tw`text-white mr-2`}>Notifications</Text>
            <Switch
              value={!!updatedData.notifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#777', true: '#ec4899' }}
              thumbColor="#fff"
            />
          </View>

          {/* Bio */}
          <Text style={tw`text-white font-semibold mb-2`}>Bio</Text>
          <TextInput
            placeholder="Write a brief introduction about yourself..."
            value={updatedData.bio}
            onChangeText={(text) =>
              setUpdatedData((prev: any) => ({ ...prev, bio: text }))
            }
            style={tw`bg-gray-800 text-white p-2 rounded mb-4`}
            multiline
            placeholderTextColor="#ccc"
          />

          {/* Pricing Section */}
          <Text style={tw`text-white font-semibold mb-2`}>
            Set Your Rates (Tokens per Session @10Shs/Token)
          </Text>
          <View style={tw`mb-4`}>
            {['privateSession', 'groupSession', 'lecture', 'workshop'].map((field) => {
              const tokenRanges: Record<string, { min: number; max: number }> = {
                privateSession: { min: 20, max: 150 },
                groupSession: { min: 15, max: 80 },
                lecture: { min: 10, max: 50 },
                workshop: { min: 15, max: 200 },
              };
              return (
                <View key={field} style={tw`mb-2`}>
                  <Text style={tw`text-gray-300 text-sm mb-1`}>
                    {field.replace(/([A-Z])/g, ' $1')} (Min: {tokenRanges[field].min} | Max: {tokenRanges[field].max})
                  </Text>
                  <TextInput
                    placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1')} Tokens`}
                    value={updatedData.pricing[field]}
                    onChangeText={(text) =>
                      handlePricingChange({ target: { value: text } } as any, field)
                    }
                    style={tw`bg-gray-800 text-gray-300 p-2 rounded`}
                    keyboardType="numeric"
                    placeholderTextColor="#ccc"
                  />
                </View>
              );
            })}
          </View>

          {/* Expertise Section */}
          <Text style={tw`text-white font-semibold mb-2`}>Expertise</Text>
          <View style={tw`flex-row flex-wrap mb-4`}>
            {['Exam Prep', 'Skill Building', 'Homework Help', 'Career Guidance'].map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() =>
                  setUpdatedData((prev: any) => ({
                    ...prev,
                    expertise: prev.expertise.includes(option)
                      ? prev.expertise.filter((item: any) => item !== option)
                      : [...prev.expertise, option],
                  }))
                }
                style={tw.style(
                  "p-2 rounded border m-1",
                  updatedData.expertise.includes(option) ? "border-pink-500" : "border-gray-700"
                )}
              >
                <Text style={tw`text-white text-sm`}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Teaching Style Section */}
          <Text style={tw`text-white font-semibold mb-2`}>Teaching Styles</Text>
          <View style={tw`flex-row flex-wrap mb-4`}>
            {['One-on-One', 'Group', 'Workshop', 'Lecture'].map((style) => (
              <TouchableOpacity
                key={style}
                onPress={() => handleTeachingStyleSelect(style)}
                style={tw.style(
                  "p-2 rounded border m-1",
                  updatedData.teachingStyle.includes(style) ? "border-pink-500" : "border-gray-700"
                )}
              >
                <Text style={tw`text-white text-sm`}>{style}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Experience Level */}
          <Text style={tw`text-white font-semibold mb-2`}>Experience Level</Text>
          <Picker
            selectedValue={updatedData.experienceLevel}
            onValueChange={(itemValue) =>
              setUpdatedData((prev: any) => ({ ...prev, experienceLevel: itemValue }))
            }
            style={tw`bg-gray-800 text-white mb-4`}
          >
            <Picker.Item label="Select Experience Level" value="" />
            <Picker.Item label="Beginner" value="Beginner" />
            <Picker.Item label="Intermediate" value="Intermediate" />
            <Picker.Item label="Advanced" value="Advanced" />
            <Picker.Item label="Expert" value="Expert" />
          </Picker>

          {/* Age Group Section */}
          <Text style={tw`text-white font-semibold mb-2`}>Age Groups</Text>
          <View style={tw`flex-row flex-wrap mb-4`}>
            {['Pre-Primary', 'Lower Primary', 'Upper Primary', 'University/College', 'Adults'].map((group) => (
              <TouchableOpacity
                key={group}
                onPress={() => handleAgeGroupSelect(group)}
                style={tw.style(
                  "p-2 rounded border m-1",
                  updatedData.ageGroup.includes(group) ? "border-pink-500" : "border-gray-700"
                )}
              >
                <Text style={tw`text-white text-sm`}>{group}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Payment Method Section */}
          <Text style={tw`text-xl font-semibold text-white mb-2`}>Payment Method</Text>
          <View style={tw`mb-4`}>
            <Text style={tw`text-gray-300 text-sm font-medium mb-1`}>Choose Payment Method</Text>
            <Picker
              selectedValue={updatedData.paymentMethod}
              onValueChange={(itemValue) =>
                handlePaymentMethodChange({ target: { value: itemValue } } as any)
              }
              style={tw`bg-gray-700 text-white`}
            >
              <Picker.Item label="Select Payment Method" value="" />
              <Picker.Item label="Bank" value="bank" />
              <Picker.Item label="M-Pesa" value="mpesa" />
            </Picker>
          </View>
          {updatedData.paymentMethod === 'bank' && (
            <View style={tw`mb-4`}>
              <TextInput
                placeholder="Bank Account Number"
                value={updatedData.bankAccount}
                onChangeText={(text) =>
                  handlePaymentDetailsChange({ target: { name: 'bankAccount', value: text } } as any)
                }
                style={tw`bg-gray-700 text-white p-2 rounded mb-2`}
                placeholderTextColor="#ccc"
              />
              <TextInput
                placeholder="Bank Code"
                value={updatedData.bankCode}
                onChangeText={(text) =>
                  handlePaymentDetailsChange({ target: { name: 'bankCode', value: text } } as any)
                }
                style={tw`bg-gray-700 text-white p-2 rounded`}
                placeholderTextColor="#ccc"
              />
            </View>
          )}
          {updatedData.paymentMethod === 'mpesa' && (
            <View style={tw`mb-4`}>
              <TextInput
                placeholder="M-Pesa Phone Number"
                value={updatedData.mpesaPhoneNumber}
                onChangeText={(text) =>
                  handlePaymentDetailsChange({ target: { name: 'mpesaPhoneNumber', value: text } } as any)
                }
                style={tw`bg-gray-700 text-white p-2 rounded`}
                placeholderTextColor="#ccc"
              />
            </View>
          )}
        </>
      )}

      {/* Gallery Section */}
      <View style={tw`mb-4`}>
        <Text style={tw`text-white mb-2`}>Upload Profile Image</Text>
        <View style={tw`w-40 h-40 border rounded flex items-center justify-center relative`}>
          {updatedData.gallery[0] ? (
            <Image
              source={
                updatedData.gallery[0] instanceof File
                  ? { uri: URL.createObjectURL(updatedData.gallery[0]) }
                  : { uri: updatedData.gallery[0] }
              }
              style={tw`w-full h-full rounded`}
            />
          ) : (
            <View style={tw`w-full h-full bg-gray-800 rounded flex items-center justify-center`}>
              <Text style={tw`text-gray-500`}>No image</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => handleDeleteImage(0)}
            style={tw`absolute top-2 right-2 bg-red-600 p-1 rounded-full`}
          >
            <Text style={tw`text-white`}>×</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleFileChange({ target: { files: [] } } as any, 0, 'image')}
            style={tw`absolute bottom-2 right-2 bg-blue-500 p-1 rounded`}
          >
            <Text style={tw`text-white text-xs`}>
              {updatedData.gallery[0] ? 'Replace' : 'Upload'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Video Section */}
      <View style={tw`mb-4`}>
        <Text style={tw`text-white mb-2`}>Uploaded Video</Text>
        <View style={tw`relative`}>
          {updatedData.video ? (
            <View style={tw`w-full h-40 bg-gray-800 rounded flex items-center justify-center`}>
              <Text style={tw`text-gray-500`}>Video Preview</Text>
            </View>
          ) : (
            <View style={tw`w-full h-40 bg-gray-800 rounded flex items-center justify-center`}>
              <Text style={tw`text-gray-500`}>No video uploaded</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => handleDeleteVideo()}
            style={tw`absolute top-2 right-2 bg-red-600 p-1 rounded-full`}
          >
            <Text style={tw`text-white`}>×</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleFileChange({ target: { files: [] } } as any, 0, 'video')}
            style={tw`absolute bottom-2 right-2 bg-blue-500 p-1 rounded`}
          >
            <Text style={tw`text-white text-xs`}>
              {updatedData.video ? 'Replace' : 'Upload'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recommendations Section */}
      <View style={tw`mb-4`}>
        <Text style={tw`text-white mb-2`}>Recommendations</Text>
        <TextInput
          placeholder="Search profiles to recommend..."
          onChangeText={(text) => handleSearch({ target: { value: text } } as any)}
          style={tw`bg-gray-800 text-white p-2 rounded mb-2`}
          placeholderTextColor="#ccc"
        />
        {searchResults.length > 0 && (
          <View style={tw`bg-gray-800 p-2 rounded mb-2`}>
            {searchResults.map((prof: any) => (
              <View key={prof._id} style={tw`flex-row justify-between items-center mb-1`}>
                <Text style={tw`text-white`}>{prof.name}</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (!updatedData.recommended.includes(prof._id)) {
                      handleAddRecommendation(prof._id);
                    } else {
                      toast.info(`${prof.name} is already recommended.`);
                    }
                  }}
                  style={tw`bg-pink-500 p-1 rounded`}
                >
                  <Text style={tw`text-white text-xs`}>Add</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View style={tw`mb-4`}>
          <Text style={tw`text-gray-300 text-sm font-semibold mb-1`}>Selected Recommendations</Text>
          {updatedData.recommended.length > 0 ? (
            updatedData.recommended.map((id: string) => {
              const prof = availableProfiles.find((profile: any) => profile._id === id);
              return (
                prof && (
                  <View key={id} style={tw`flex-row justify-between items-center bg-gray-900 p-2 rounded mb-1`}>
                    <Text style={tw`text-white text-sm font-medium`}>{prof.name}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveRecommendation(id)}
                      style={tw`bg-red-600 p-1 rounded`}
                    >
                      <Text style={tw`text-white text-xs`}>×</Text>
                    </TouchableOpacity>
                  </View>
                )
              );
            })
          ) : (
            <Text style={tw`text-gray-500 text-sm`}>No recommendations selected.</Text>
          )}
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isUploading}
        style={tw`bg-pink-500 p-3 rounded-lg mt-4 mb-6`}
      >
        <Text style={tw`text-white text-center`}>
          {isUploading ? 'Updating Profile...' : 'Update Profile'}
        </Text>
      </TouchableOpacity>

      {/* Optional Navigation Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Settings')}
        style={tw`bg-blue-600 p-3 rounded-lg mb-4`}
      >
        <Text style={tw`text-white text-center`}>Go to Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ManageProfileForm;
