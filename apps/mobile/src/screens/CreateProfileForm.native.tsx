/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StatusBar,            // ✅ NEW
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useProfileForm } from '@mytutorapp/shared/hooks';
import type { UploadAsset } from '@mytutorapp/shared/types';
import { COUNTRIES } from '@mytutorapp/shared/utils/countries';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; // ✅ NEW
import tw from '../../tailwind';

type RootStackParamList = { Home: undefined };
type PricingKeys = 'privateSession' | 'groupSession' | 'workshop' | 'lecture';
const pricingFields: PricingKeys[] = ['privateSession', 'groupSession', 'workshop', 'lecture'];

/** Match web min/max ranges (tokens == USD) */
const tokenRanges: Record<PricingKeys, { min: number; max: number }> = {
  privateSession: { min: 5, max: 50 },
  groupSession:   { min: 5, max: 50 },
  workshop:       { min: 5, max: 100 },
  lecture:        { min: 5, max: 100 },
};

function isUploadAsset(obj: unknown): obj is UploadAsset {
  return !!obj && typeof (obj as UploadAsset).uri === 'string';
}

/* ────────────────────── Subject categories (minimal) ────────────────────── */
const SUBJECT_CATEGORIES = [
  'Mathematics',
  'Sciences',
  'Languages',
  'Arts',
  'Social Studies',
  'Technology & Computing',
  'Business & Economics',
  'Wellness & PE',
] as const;

export default function CreateProfileFormNative() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets(); // ✅ NEW

  const {
    role,
    // basics
    name, setName,
    age, setAge,
    languages, handleLanguageSelect,

    category, setCategory,
    bio, setBio,
    expertise, setExpertise,
    teachingStyle, setTeachingStyle,
    pricing, handlePricingChange,

    // media
    images, setImages,
    videoPreview, handleVideoChange, handleRemoveVideo,

    // payout (parity with web)
    payoutCurrency,
    payoutMethod, setPayoutMethod,
    wiseEmail, setWiseEmail,
    mpesaPhoneNumber, setMpesaPhoneNumber,

    // ✅ NEW: geo + grade that we actually use
    country, setCountry,
    schoolGrade, setSchoolGrade,

    // submit + step
    loading, handleSubmit, step,
  } = useProfileForm({ onSuccess: () => navigation.navigate('Home') });

  // Ask once for perms (camera + library)
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        const lib = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (cam.status !== 'granted' || lib.status !== 'granted') {
          Alert.alert('Permissions required', 'Camera and media library access are needed for photos & video.');
        }
      }
    })();
  }, []);

  // ---------- Media pickers (images) ----------
  const pickImage = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required','We need access to your photos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (res.canceled) return;
    const a = Array.isArray(res.assets) && res.assets.length > 0 ? res.assets[0] : undefined;
    if (!a) return;

    const upload: UploadAsset = {
      uri: a.uri,
      name: a.fileName ?? undefined,
      type: a.type ?? undefined,
    };
    setImages([upload]);
  };

  // ---------- Media pickers (video) ----------
  const toSeconds = (raw?: number | null) => {
    const n = Number(raw ?? 0);
    return n > 1000 ? n / 1000 : n;
  };

  const pickVideo = async () => {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required', 'We need access to your videos.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 30,
    });
    if (res.canceled) return;

    const a = Array.isArray(res.assets) && res.assets.length > 0 ? res.assets[0] : undefined;
    if (!a) return;

    const durSec = toSeconds(a.duration ?? undefined);
    if (durSec > 30) {
      Alert.alert('Too long', `Your clip is ${durSec.toFixed(1)}s. Please select ≤ 30s.`);
      return;
    }

    const upload: UploadAsset = {
      uri: a.uri,
      name: a.fileName ?? undefined,
      type: a.type ?? undefined,
      duration: typeof a.duration === 'number' ? a.duration : undefined,
    };
    try {
      handleVideoChange(upload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Error', msg);
    }
  };

  const recordVideo = async () => {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      Alert.alert('Permission required', 'We need access to your camera.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 30,
      quality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });
    if (res.canceled) return;

    const a = Array.isArray(res.assets) && res.assets.length > 0 ? res.assets[0] : undefined;
    if (!a) return;

    const durSec = toSeconds(a.duration ?? undefined);
    if (durSec > 30) {
      Alert.alert('Too long', `Your recording is ${durSec.toFixed(1)}s. Please record ≤ 30s.`);
      return;
    }

    const upload: UploadAsset = {
      uri: a.uri,
      name: a.fileName ?? undefined,
      type: a.type ?? undefined,
      duration: typeof a.duration === 'number' ? a.duration : undefined,
    };
    try {
      handleVideoChange(upload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Error', msg);
    }
  };

  // -------- Native validations to mirror web --------
  const languagesSelected = useMemo(
    () => Object.values(languages).some(Boolean),
    [languages]
  );

  const onSubmitPress = () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter your name.');
      return;
    }
    if (!age.trim()) {
      Alert.alert('Missing age', 'Please enter your age.');
      return;
    }
    if (!languagesSelected) {
      Alert.alert('Languages', 'Select at least one language you speak.');
      return;
    }

    if (!country) { Alert.alert('Country', 'Please select your country.'); return; }
    if (!schoolGrade.trim()) { Alert.alert('School Grade', 'Please enter your grade / year / level.'); return; }

    if (role === 'tutor') {
      if (!category) {
        Alert.alert('Category', 'Select your subject/skill category.');
        return;
      }
      if (payoutMethod === 'mpesa' && !mpesaPhoneNumber.trim()) {
        Alert.alert('M-Pesa', 'Enter your M-Pesa phone number.');
        return;
      }
      if (payoutMethod === 'wise' && !wiseEmail.trim()) {
        Alert.alert('Wise', 'Enter your Wise account email.');
        return;
      }
    }

    handleSubmit({} as React.FormEvent);
  };

  // -------- Intro video preview (expo-video) --------
  const previewPlayer = useVideoPlayer(null, (p) => { p.loop = true; });

  useEffect(() => {
    (async () => {
      try {
        await previewPlayer.pause();
        await previewPlayer.replace(videoPreview || null);
      } catch {
        // ignore
      }
    })();
  }, [videoPreview, previewPlayer]);

  return (
    <SafeAreaView
      style={tw`flex-1 bg-gray-900`}         // ✅ Safe area with your dark bg
      edges={['top','left','right','bottom']} // ✅ apply to all sides
    >
      {/* Optional: better status bar contrast on dark bg */}
      <StatusBar barStyle="light-content" backgroundColor="#0b1220" />

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={[
          tw`p-4 gap-6`,
          { paddingBottom: Math.max(insets.bottom + 32, 32) }, // ✅ keep bottom CTA clear
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={tw`text-2xl font-bold text-pink-400 text-center`}>
          Create Your Profile
        </Text>

        {step === 'bg-video' && (
          <Text style={tw`text-sm text-gray-400`}>
            Uploading your intro video in the background… you can continue using the app.
          </Text>
        )}

        {/* Role display */}
        {role ? (
          <View style={tw`gap-2`}>
            <Text style={tw`text-base text-gray-400`}>Your Role</Text>
            <Text style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}>{role}</Text>
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

        {/* Country */}
        <View style={tw`gap-2`}>
          <Text style={tw`text-base text-gray-400`}>Country</Text>
          <Picker selectedValue={country} onValueChange={setCountry} style={tw`bg-gray-800 rounded`}>
            <Picker.Item label="Select your country" value="" />
            {COUNTRIES.map((c) => (
              <Picker.Item key={c.code} label={c.name} value={c.code} />
            ))}
          </Picker>
        </View>

        {/* School Grade / Year / Level */}
        <View style={tw`gap-2`}>
          <Text style={tw`text-base text-gray-400`}>School Grade / Year / Level</Text>
          <TextInput
            placeholder="e.g., Grade 7, Form 2, Year 10, Freshman …"
            value={schoolGrade}
            onChangeText={setSchoolGrade}
            placeholderTextColor="#9CA3AF"
            style={tw`w-full p-3 rounded bg-gray-800 text-white text-base`}
          />
        </View>

        {/* Language chips */}
        <View style={tw`gap-2`}>
          <Text style={tw`text-base text-gray-400`}>Select Languages You Speak</Text>
          <View style={tw`flex-row flex-wrap gap-2`}>
            {Object.keys(languages).map((lang) => {
              const on = languages[lang];
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => handleLanguageSelect(lang)}
                  style={tw`${on ? 'bg-pink-500' : 'bg-gray-800'} px-3 py-1 rounded`}
                >
                  <Text style={on ? tw`text-white` : tw`text-gray-400`}>{lang}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tutor-only extras */}
        {role === 'tutor' && (
          <View style={tw`gap-4`}>
            {/* Category */}
            <View style={tw`gap-2`}>
              <Text style={tw`text-base text-gray-400`}>Subject / Skill Category</Text>
              <Picker selectedValue={category} onValueChange={(v) => setCategory(v)} style={tw`bg-gray-800 rounded`}>
                <Picker.Item label="Select a category…" value="" />
                {SUBJECT_CATEGORIES.map((c) => (
                  <Picker.Item key={c} label={c} value={c} />
                ))}
              </Picker>
            </View>

            {/* Payout Preferences */}
            <View style={tw`gap-3`}>
              <Text style={tw`text-base font-semibold text-gray-400`}>Payout Preferences</Text>

              <View>
                <Text style={tw`text-sm text-gray-400 mb-1`}>Payout Method</Text>
                <Picker selectedValue={payoutMethod} onValueChange={(v) => setPayoutMethod(v)} style={tw`bg-gray-800 rounded`}>
                  <Picker.Item label="Wise (USD)" value="wise" />
                  <Picker.Item label="M-Pesa (KES)" value="mpesa" />
                </Picker>
              </View>

              <View>
                <Text style={tw`text-sm text-gray-400 mb-1`}>Payout Currency</Text>
                <Text style={tw`w-full p-3 rounded bg-gray-800 text-white`}>{payoutCurrency}</Text>
                <Text style={tw`text-xs text-gray-400 mt-1`}>
                  Wise pays in USD to your Wise account. M-Pesa payouts settle in KES.
                </Text>
              </View>

              {payoutMethod === 'wise' && (
                <View>
                  <Text style={tw`text-sm text-gray-400 mb-1`}>Wise account email</Text>
                  <TextInput
                    placeholder="you@yourdomain.com"
                    value={wiseEmail}
                    onChangeText={setWiseEmail}
                    placeholderTextColor="#9CA3AF"
                    style={tw`w-full p-3 rounded bg-gray-800 text-white`}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {payoutMethod === 'mpesa' && (
                <View style={tw`gap-1`}>
                  <Text style={tw`text-base text-gray-400`}>M-Pesa Phone Number</Text>
                  <TextInput
                    placeholder="+2547XXXXXXXX"
                    value={mpesaPhoneNumber}
                    onChangeText={setMpesaPhoneNumber}
                    placeholderTextColor="#9CA3AF"
                    style={tw`w-full p-3 rounded bg-gray-800 text-white`}
                    keyboardType="phone-pad"
                  />
                </View>
              )}
            </View>

            {/* Teaching styles */}
            <View style={tw`gap-2`}>
              <Text style={tw`text-base font-semibold text-gray-400`}>Teaching Styles</Text>
              <View style={tw`flex-row flex-wrap gap-2`}>
                {['One-on-One','Group','Workshop','Lecture'].map((s) => {
                  const on = teachingStyle.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() =>
                        setTeachingStyle((prev) => (on ? prev.filter((i) => i !== s) : [...prev, s]))
                      }
                      style={tw`${on ? 'bg-pink-500' : 'bg-gray-800'} px-3 py-1 rounded`}
                    >
                      <Text style={on ? tw`text-white` : tw`text-gray-400`}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Bio */}
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

            {/* Expertise */}
            <View style={tw`gap-2`}>
              <Text style={tw`text-base font-semibold text-gray-400`}>Expertise</Text>
              <View style={tw`flex-row flex-wrap gap-2`}>
                {['Exam Prep','Skill Building','Homework Help','Career Guidance'].map((skill) => {
                  const on = expertise.includes(skill);
                  return (
                    <TouchableOpacity
                      key={skill}
                      onPress={() =>
                        setExpertise((prev) => (on ? prev.filter((i) => i !== skill) : [...prev, skill]))
                      }
                      style={tw`${on ? 'bg-pink-500' : 'bg-gray-800'} px-3 py-1 rounded`}
                    >
                      <Text style={on ? tw`text-white` : tw`text-gray-400`}>{skill}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Pricing */}
            <View style={tw`gap-4`}>
              <Text style={tw`text-base text-gray-400`}>Set Your Rates (1 token = $1 USD)</Text>
              <View style={tw`flex-row flex-wrap -mx-2`}>
                {pricingFields.map((field) => {
                  const { min, max } = tokenRanges[field];
                  return (
                    <View key={field} style={tw`w-1/2 px-2 mb-4`}>
                      <Text style={tw`text-sm text-gray-300`}>
                        {field.replace(/([A-Z])/g,' $1')} (Min: {min} | Max: {max})
                      </Text>
                      <TextInput
                        placeholder={`Enter ${field.replace(/([A-Z])/g,' $1')} Tokens`}
                        value={pricing[field]}
                        onChangeText={(t) => handlePricingChange(field, t)}
                        keyboardType="numeric"
                        placeholderTextColor="#9CA3AF"
                        style={tw`w-full p-2 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 text-sm`}
                      />
                    </View>
                  );
                })}
              </View>
              <Text style={tw`text-xs text-gray-400`}>
                Tip: For group pricing, enter the price <Text style={tw`font-bold`}>per learner</Text>.
              </Text>
            </View>

            {/* Profile image */}
            <View style={tw`gap-2`}>
              <Text style={tw`text-base text-gray-400`}>Upload Profile Image</Text>
              <TouchableOpacity
                onPress={pickImage}
                style={tw`w-24 h-24 border items-center justify-center rounded bg-gray-800`}
              >
                {images[0] && isUploadAsset(images[0]) ? (
                  <Image source={{ uri: images[0].uri }} style={tw`w-full h-full rounded`} />
                ) : (
                  <Text style={tw`text-gray-400 text-xs`}>Upload</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Video record/upload + preview */}
            <View style={tw`gap-2`}>
              <Text style={tw`text-base text-gray-400`}>Introduction Video (30s max)</Text>
              <View style={tw`flex-row gap-2`}>
                <TouchableOpacity onPress={recordVideo} style={tw`bg-pink-500 px-4 py-2 rounded`}>
                  <Text style={tw`text-white`}>Record</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickVideo} style={tw`bg-gray-800 px-4 py-2 rounded`}>
                  <Text style={tw`text-gray-200`}>Upload</Text>
                </TouchableOpacity>
              </View>

              {videoPreview && (
                <View style={tw`gap-2`}>
                  <Text style={tw`text-base text-gray-400`}>Preview</Text>
                  <View style={tw`w-24 h-24 border items-center justify-center rounded bg-gray-800 overflow-hidden`}>
                    <VideoView
                      player={previewPlayer}
                      style={tw`w-full h-full rounded`}
                      nativeControls
                      contentFit="cover"
                      allowsFullscreen
                      allowsPictureInPicture
                    />
                    <TouchableOpacity
                      onPress={handleRemoveVideo}
                      style={tw`absolute top-1 right-1 bg-red-500 rounded-full p-1`}
                    >
                      <Text style={tw`text-white text-xs`}>X</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          onPress={onSubmitPress}
          disabled={loading}
          style={tw`w-full bg-pink-500 py-3 rounded-lg ${loading ? 'opacity-70' : ''}`}
        >
          <Text style={tw`text-white text-center text-base`}>
            {loading
              ? (step === 'uploading' ? 'Uploading images…'
                : step === 'creating' ? 'Creating profile…'
                : 'Creating profile…')
              : 'Create Profile'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
