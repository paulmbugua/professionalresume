/* eslint-disable prettier/prettier */
// apps/mobile/src/screens/ManageProfileForm.native.tsx
import React, { useEffect, useMemo } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video'; // ✅ expo-video
import tw from '../../tailwind';

import { useNavigation } from '@react-navigation/native';
import { useShopContext } from '@mytutorapp/shared/context';
import { useManageProfileForm } from '@mytutorapp/shared/hooks';
import type { ChangeEvent } from 'react';

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

// ---------- helpers ----------
const makeEvent = (value: string): ChangeEvent<any> =>
  ({ target: { value } } as ChangeEvent<any>);

const hasUri = (obj: unknown): obj is { uri: string } =>
  typeof obj === 'object' && obj !== null && 'uri' in obj && typeof (obj as any).uri === 'string';

const resolveAssetUri = (raw: string, backendUrl: string): string =>
  raw?.startsWith('/') ? `${backendUrl}${raw}` : raw;

const TOKEN_RANGES = {
  privateSession: { min: 5, max: 50 },
  groupSession:   { min: 5, max: 50 },
  lecture:        { min: 5, max: 100 },
  workshop:       { min: 5, max: 100 },
} as const;
type TokenField = keyof typeof TOKEN_RANGES;

// ---------- component ----------
export default function ManageProfileFormNative() {
  const navigation = useNavigation();
  const { backendUrl } = useShopContext();

  const {
    role,
    updatedData,
    availableProfiles,
    searchResults,
    isUploading,

    // generic inputs
    handleInputChange,
    setUpdatedData,

    // toggles / multi-selects
    handleLanguageSelect,
    handleAgeGroupSelect,
    handleTeachingStyleSelect,
    handleExpertiseSelect,

    // pricing
    handlePricingChange,

    // search + recommendations
    handleSearch,
    handleAddRecommendation,
    handleRemoveRecommendation,

    // media
    handleDeleteImage,
    handleDeleteVideo,

    // notifications
    handleToggleNotifications,

    // final submit
    handleSubmit,

    // 🌍 NEW from hook (shared with web & create form)
    region, setRegion,
    country, setCountry,
    bandKey, setBandKey,
    countries, bands, regionOptions,
  } = useManageProfileForm(navigation.navigate);

  // ---------- pickers ----------
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;
    setUpdatedData(prev => {
      const g = [...prev.gallery];
      g[0] = uri;
      return { ...prev, gallery: g };
    });
  };

  const replaceVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your videos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 30,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const uri = result.assets[0].uri;
    setUpdatedData(prev => ({ ...prev, video: uri as any }));
  };

  // ---------- computed asset URIs ----------
  const gallery0 = updatedData.gallery?.[0];
  const imageUri = useMemo(() => {
    if (typeof gallery0 === 'string') return resolveAssetUri(gallery0, backendUrl);
    if (hasUri(gallery0)) return gallery0.uri;
    return '';
  }, [gallery0, backendUrl]);

  const videoUri = useMemo(() => {
    if (typeof updatedData.video === 'string') return resolveAssetUri(updatedData.video, backendUrl);
    if (hasUri(updatedData.video)) return updatedData.video.uri;
    return '';
  }, [updatedData.video, backendUrl]);

  // ---------- styles ----------
  const section = tw`bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4`;
  const input   = tw`w-full p-3 rounded bg-gray-700 text-white mb-3`;
  const pillOn  = tw`px-3 py-1 mr-2 mb-2 rounded-full border bg-pink-600 border-pink-500`;
  const pillOff = tw`px-3 py-1 mr-2 mb-2 rounded-full border bg-gray-700 border-gray-600`;
  const pickerWrap = tw`overflow-visible z-50 mb-4`;
  const pickerStyle = tw`bg-gray-700 rounded`;
  const placeholderColor = '#9CA3AF';
  const selectedColor = '#fff';

  // ---------- validation (web parity, now requires band) ----------
  const validateBeforeSubmit = (): { ok: true } | { ok: false; msg: string } => {
    const minAge = role === 'tutor' ? 18 : 5;

    if (!updatedData.name?.trim()) return { ok: false, msg: 'Please enter your name.' };
    if (!updatedData.age || updatedData.age < minAge)
      return { ok: false, msg: `Please enter a valid age (${minAge}+).` };

    const hasLanguage = Object.values(updatedData.languages || {}).some(Boolean);
    if (!hasLanguage) return { ok: false, msg: 'Select at least one language.' };

    if (role === 'student') {
      if (!updatedData.ageGroup?.length) {
        return { ok: false, msg: 'Choose at least one age group.' };
      }
      return { ok: true };
    }

    if (role === 'tutor') {
      if (!updatedData.category) return { ok: false, msg: 'Please select a category.' };
      if (!bandKey) return { ok: false, msg: 'Please choose your primary Grade Band.' };

      for (const key of Object.keys(TOKEN_RANGES) as TokenField[]) {
        const val = updatedData.pricing[key];
        const { min, max } = TOKEN_RANGES[key];
        if (!Number.isFinite(val) || (val as number) < min || (val as number) > max) {
          return { ok: false, msg: `Set a valid rate for ${key} (${min}–${max}).` };
        }
      }

      if (updatedData.payoutMethod === 'wise') {
        if (!updatedData.wiseEmail?.trim()) {
          return { ok: false, msg: 'Enter a valid Wise account email.' };
        }
      } else if (updatedData.payoutMethod === 'mpesa') {
        if (!updatedData.mpesaPhoneNumber?.trim()) {
          return { ok: false, msg: 'Enter a valid M-Pesa phone number.' };
        }
      } else {
        return { ok: false, msg: 'Choose Wise or M-Pesa as payout method.' };
      }
    }

    return { ok: true };
  };

  // ensure currency derives from method (like web)
  const payoutCurrency = updatedData.payoutMethod === 'mpesa' ? 'KES' : 'USD';

  // ---------- intro video preview (expo-video) ----------
  const previewPlayer = useVideoPlayer(null, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    (async () => {
      try {
        await previewPlayer.pause();
        await previewPlayer.replace(videoUri || null);
      } catch {
        // ignore
      }
    })();
  }, [videoUri, previewPlayer]);

  // ---------- render ----------
  return (
    <ScrollView style={tw`flex-1 bg-gray-900`} contentContainerStyle={tw`p-4 pb-20`}>
      <Text style={tw`text-gray-400 mb-2`}>Role: {role || 'Loading…'}</Text>

      {/* Personal Info */}
      <View style={section}>
        <TextInput
          placeholder="Name"
          value={updatedData.name}
          onChangeText={(t) => handleInputChange('name', makeEvent(t))}
          placeholderTextColor={placeholderColor}
          style={input}
        />
        <TextInput
          placeholder="Age"
          keyboardType="numeric"
          value={updatedData.age ? String(updatedData.age) : ''}
          onChangeText={(t) => handleInputChange('age', makeEvent(t))}
          placeholderTextColor={placeholderColor}
          style={[input, tw`mb-0`]}
        />
      </View>

      {/* Languages */}
      <View style={section}>
        <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Languages</Text>
        <View style={tw`flex-row flex-wrap`}>
          {Object.keys(updatedData.languages).map((lang) => {
            const on = !!updatedData.languages[lang];
            return (
              <TouchableOpacity key={lang} onPress={() => handleLanguageSelect(lang)} style={on ? pillOn : pillOff}>
                <Text style={on ? tw`text-white` : tw`text-gray-300`}>{lang}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Student: Age Groups */}
      {role === 'student' && (
        <View style={section}>
          <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Age Groups</Text>
          <View style={tw`flex-row flex-wrap`}>
            {['Pre-Primary','Lower Primary','Upper Primary','University/College','Adults'].map((g) => {
              const on = updatedData.ageGroup.includes(g);
              return (
                <TouchableOpacity key={g} onPress={() => handleAgeGroupSelect(g)} style={on ? pillOn : pillOff}>
                  <Text style={on ? tw`text-white` : tw`text-gray-300`}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Tutor-only */}
      {role === 'tutor' && (
        <>
          {/* Region → Country → Grade Band (from hook) */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Region</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={region}
                onValueChange={(v) => setRegion(v as any)}
                style={[pickerStyle, { color: '#fff' }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor="#fff"
              >
                {regionOptions.map((r) => (
                  <Picker.Item key={r.value} label={r.label} value={r.value} />
                ))}
              </Picker>
            </View>

            <Text style={tw`text-gray-300 font-semibold mb-2`}>Country</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={country}
                onValueChange={(v) => setCountry(v as any)}
                style={[pickerStyle, { color: '#fff' }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor="#fff"
              >
                {countries.map((c) => (
                  <Picker.Item key={c.code} label={c.label} value={c.code} />
                ))}
              </Picker>
            </View>

            <Text style={tw`text-gray-300 font-semibold mb-2`}>Primary Grade Band</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={bandKey}
                onValueChange={(v) => setBandKey(v as any)}
                style={[pickerStyle, { color: bandKey ? '#fff' : '#9CA3AF' }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor="#fff"
              >
                <Picker.Item label="Select grade band…" value="" color="#9CA3AF" />
                {bands.map((b) => (
                  <Picker.Item key={b.key} label={b.label} value={b.key} />
                ))}
              </Picker>
            </View>
            <Text style={tw`text-gray-400 text-xs`}>
              Helps learners find you by country & level (e.g., “Kenya · Junior School”).
            </Text>
          </View>

          {/* Category (now minimal subjects) */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Category</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={updatedData.category}
                onValueChange={(val: string) => handleInputChange('category', makeEvent(val))}
                style={[pickerStyle, { color: updatedData.category ? selectedColor : placeholderColor }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
              >
                <Picker.Item label="Select a category…" value="" color={placeholderColor} />
                {SUBJECT_CATEGORIES.map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Status (includes "New" like web) */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Status</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={updatedData.status}
                onValueChange={(val: string) => handleInputChange('status', makeEvent(val))}
                style={[pickerStyle, { color: updatedData.status ? selectedColor : placeholderColor }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
              >
                {['Online','Offline','Busy','Free Session','New'].map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Notifications */}
          <View style={[section, tw`flex-row items-center justify-between`]}>
            <Text style={tw`text-gray-300`}>Notifications</Text>
            <Switch
              value={!!updatedData.notifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#374151', true: '#ec4899' }}
              thumbColor="#f9fafb"
            />
          </View>

          {/* Bio */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Bio</Text>
            <TextInput
              placeholder="Write a brief introduction…"
              multiline
              value={updatedData.bio}
              onChangeText={(t) => handleInputChange('bio', makeEvent(t))}
              placeholderTextColor={placeholderColor}
              style={[input, tw`h-24`]}
            />
          </View>

          {/* Pricing (web ranges) */}
          <View style={section}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Rates (1 token = $1 USD)</Text>
            <View style={tw`flex-row flex-wrap -mx-2`}>
              {(Object.keys(TOKEN_RANGES) as TokenField[]).map((field) => {
                const { min, max } = TOKEN_RANGES[field];
                const label = field.replace(/([A-Z])/g, ' $1');
                return (
                  <View key={field} style={tw`w-1/2 px-2 mb-3`}>
                    <Text style={tw`text-sm text-gray-400 mb-1`}>
                      {label} (Min {min}, Max {max})
                    </Text>
                    <TextInput
                      keyboardType="numeric"
                      value={String(updatedData.pricing[field] ?? '')}
                      onChangeText={(t) => handlePricingChange(field, t)}
                      placeholderTextColor={placeholderColor}
                      style={tw`w-full p-2 rounded bg-gray-700 text-gray-200 border border-gray-600`}
                    />
                  </View>
                );
              })}
            </View>
          </View>

          {/* Expertise */}
          <View style={section}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Expertise</Text>
            <View style={tw`flex-row flex-wrap`}>
              {['Exam Prep','Skill Building','Homework Help','Career Guidance'].map((opt) => {
                const on = updatedData.expertise.includes(opt);
                return (
                  <TouchableOpacity key={opt} onPress={() => handleExpertiseSelect(opt)} style={on ? pillOn : pillOff}>
                    <Text style={on ? tw`text-white` : tw`text-gray-300`}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Experience Level */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Experience Level</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={updatedData.experienceLevel}
                onValueChange={(val: string) => handleInputChange('experienceLevel', val as any)}
                style={[pickerStyle, { color: updatedData.experienceLevel ? selectedColor : placeholderColor }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
              >
                <Picker.Item label="Select experience level…" value="" color={placeholderColor} />
                {['Beginner','Intermediate','Advanced','Expert'].map((opt) => (
                  <Picker.Item key={opt} label={opt} value={opt} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Teaching Styles */}
          <View style={section}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Teaching Styles</Text>
            <View style={tw`flex-row flex-wrap`}>
              {['One-on-One','Group','Workshop','Lecture'].map((s) => {
                const on = updatedData.teachingStyle.includes(s);
                return (
                  <TouchableOpacity key={s} onPress={() => handleTeachingStyleSelect(s)} style={on ? pillOn : pillOff}>
                    <Text style={on ? tw`text-white` : tw`text-gray-300`}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Payout Preferences (Wise/M-Pesa, derived currency) */}
          <View style={section}>
            <Text style={tw`text-lg text-gray-300 mb-3 font-semibold`}>Payout Preferences</Text>

            {/* Method */}
            <Text style={tw`text-gray-300 mb-2`}>Payout Method</Text>
            <View style={pickerWrap}>
              <Picker
                selectedValue={updatedData.payoutMethod ?? 'wise'}
                onValueChange={(method: 'wise' | 'mpesa') =>
                  setUpdatedData(prev => ({
                    ...prev,
                    payoutMethod: method,
                    payoutCurrency: method === 'mpesa' ? 'KES' : 'USD',
                  }))
                }
                style={[pickerStyle, { color: selectedColor }]}
                mode={Platform.OS === 'android' ? 'dialog' : 'dropdown'}
                dropdownIconColor={selectedColor}
              >
                <Picker.Item label="Wise (USD)" value="wise" />
                <Picker.Item label="M-Pesa (KES)" value="mpesa" />
              </Picker>
            </View>

            {/* Derived currency (read-only) */}
            <Text style={tw`text-gray-400 mb-1`}>Payout Currency</Text>
            <View style={tw`flex-row items-center justify-between bg-gray-700 rounded px-3 py-3 mb-3`}>
              <Text style={tw`text-white`}>{payoutCurrency}</Text>
              <Text style={tw`text-gray-400 text-xs`}>Wise → USD • M-Pesa → KES</Text>
            </View>

            {/* Method details */}
            {updatedData.payoutMethod !== 'mpesa' && (
              <TextInput
                placeholder="Wise account email"
                value={updatedData.wiseEmail || ''}
                onChangeText={(t) => setUpdatedData(prev => ({ ...prev, wiseEmail: t }))}
                placeholderTextColor={placeholderColor}
                style={input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}

            {updatedData.payoutMethod === 'mpesa' && (
              <TextInput
                placeholder="+2547XXXXXXXX"
                value={updatedData.mpesaPhoneNumber || ''}
                onChangeText={(t) => setUpdatedData(prev => ({ ...prev, mpesaPhoneNumber: t }))}
                placeholderTextColor={placeholderColor}
                style={input}
                keyboardType="phone-pad"
              />
            )}
          </View>

          {/* Profile Image */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Profile Image</Text>
            <View style={tw`w-40 h-40 rounded-lg overflow-hidden bg-gray-700 border border-gray-600`}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={tw`w-full h-full`} resizeMode="cover" />
              ) : (
                <View style={tw`flex-1 items-center justify-center`}>
                  <Text style={tw`text-gray-400`}>No image</Text>
                </View>
              )}
            </View>
            <View style={tw`flex-row mt-3`}>
              {imageUri ? (
                <>
                  <TouchableOpacity onPress={pickImage} style={tw`bg-pink-600 px-3 py-2 rounded mr-2`}>
                    <Text style={tw`text-white`}>Replace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteImage(0)} style={tw`bg-gray-700 px-3 py-2 rounded`}>
                    <Text style={tw`text-white`}>Delete</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={pickImage} style={tw`bg-pink-600 px-3 py-2 rounded`}>
                  <Text style={tw`text-white`}>Upload</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Video */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Intro Video (≈30s)</Text>
            <View style={tw`rounded-lg overflow-hidden bg-black`}>
              {videoUri ? (
                <VideoView
                  player={previewPlayer}
                  style={tw`w-full h-40`}
                  nativeControls
                  contentFit="contain"
                  allowsFullscreen
                  allowsPictureInPicture
                />
              ) : (
                <View style={tw`w-full h-40 items-center justify-center bg-gray-700`}>
                  <Text style={tw`text-gray-300`}>No video uploaded</Text>
                </View>
              )}
            </View>
            <View style={tw`flex-row mt-3`}>
              {videoUri ? (
                <>
                  <TouchableOpacity onPress={async () => await replaceVideo()} style={tw`bg-pink-600 px-3 py-2 rounded mr-2`}>
                    <Text style={tw`text-white`}>Replace</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDeleteVideo} style={tw`bg-gray-700 px-3 py-2 rounded`}>
                    <Text style={tw`text-white`}>Delete</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={async () => await replaceVideo()} style={tw`bg-pink-600 px-3 py-2 rounded`}>
                  <Text style={tw`text-white`}>Upload</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Recommendations */}
          <View style={section}>
            <Text style={tw`text-gray-300 font-semibold mb-2`}>Recommendations</Text>
            <TextInput
              placeholder="Search profiles…"
              onChangeText={(t) => handleSearch(makeEvent(t))}
              placeholderTextColor={placeholderColor}
              style={input}
            />
            {searchResults.length > 0 && (
              <View style={tw`bg-gray-700 rounded p-2 mt-2`}>
                {searchResults.map((p) => (
                  <View key={p._id} style={tw`flex-row items-center justify-between p-2 border-b border-gray-600 last:border-b-0`}>
                    <Text style={tw`text-white`}>{p.name}</Text>
                    <TouchableOpacity onPress={() => handleAddRecommendation(p._id)} style={tw`bg-pink-600 px-3 py-1 rounded`}>
                      <Text style={tw`text-white text-sm`}>Add</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={tw`text-gray-300 font-semibold mt-3 mb-2`}>Selected</Text>
            {updatedData.recommended.length > 0 ? (
              updatedData.recommended.map((id) => {
                const prof = availableProfiles.find((x: { _id: string; name?: string }) => x._id === id);
                if (!prof) return null;
                return (
                  <View key={id} style={tw`flex-row items-center justify-between bg-gray-700 p-3 rounded mb-2`}>
                    <Text style={tw`text-white flex-1`}>{prof.name}</Text>
                    <TouchableOpacity onPress={() => handleRemoveRecommendation(id)}>
                      <Text style={tw`text-red-400 text-lg`}>✕</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <Text style={tw`text-gray-500`}>No recommendations.</Text>
            )}
          </View>
        </>
      )}

      {/* Submit */}
      <TouchableOpacity
        disabled={isUploading}
        onPress={() => {
          const v = validateBeforeSubmit();
          if (!v.ok) {
            Alert.alert('Fix required', v.msg);
            return;
          }
          handleSubmit();
        }}
        style={tw`bg-pink-600 py-3 rounded-lg items-center`}
      >
        <Text style={tw`text-white font-semibold`}>{isUploading ? 'Updating…' : 'Update Profile'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
