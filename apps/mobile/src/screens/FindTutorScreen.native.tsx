// apps/mobile/src/screens/FindTutorScreen.native.tsx
import React, { useState } from 'react'
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native'
import tw from '../../tailwind'
import { Feather, Entypo } from '@expo/vector-icons'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import type { MainStackParamList } from '../navigation/types'
import { useShopContext } from '@mytutorapp/shared/context'
import useHomePage from '@mytutorapp/shared/hooks/useHomePage'
import type { TutorProfile } from '@mytutorapp/shared/types'
import TutorReviewsNative from './TutorReviews.native'
import useTWColors from '../theme/useTWColors'

const filterOptions = ['Subject', 'Rating', 'Availability'] as const
const SUBJECT_OPTIONS = ['Math', 'Science', 'Programming', 'Art', 'Wellness', 'Languages'] as const
const RATING_OPTIONS = ['5', '4', '3', '2', '1'] as const
const AVAILABILITY_OPTIONS = ['Free', 'Busy'] as const

export default function FindTutorScreen() {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>()
  const { backendUrl } = useShopContext()
  const { filteredProfiles, loading, handleSearch, onFilterChange, filters } = useHomePage()
  const tutorProfiles: TutorProfile[] = filteredProfiles as unknown as TutorProfile[]

  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const colors = useTWColors()

  const MenuWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <View style={tw`bg-lightCard dark:bg-darkCard px-4`}>
      {children}
    </View>
  )

  const MenuRow: React.FC<{ onPress: () => void; active?: boolean; label: string }> = ({
    onPress, active, label,
  }) => (
    <TouchableOpacity
      style={tw`py-3 border-b border-lightBorder dark:border-darkBorder`}
      onPress={onPress}
    >
      <Text style={[tw`${active ? 'font-bold' : ''} font-sans text-base`, { color: colors.textPrimary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  )

  const renderSubMenu = () => {
    if (openMenu === 'Subject') {
      const selected = filters.category?.[0]
      return (
        <MenuWrapper>
          {SUBJECT_OPTIONS.map(item => (
            <MenuRow
              key={item}
              label={item}
              active={selected === item}
              onPress={() => {
                onFilterChange('category', item)
                setOpenMenu(null)
              }}
            />
          ))}
        </MenuWrapper>
      )
    }
    if (openMenu === 'Rating') {
      const selected = filters.rating?.[0]
      return (
        <MenuWrapper>
          {RATING_OPTIONS.map(item => (
            <MenuRow
              key={item}
              label={item}
              active={selected === item}
              onPress={() => {
                onFilterChange('rating', item)
                setOpenMenu(null)
              }}
            />
          ))}
        </MenuWrapper>
      )
    }
    if (openMenu === 'Availability') {
      const selected = filters.status?.[0]
      return (
        <MenuWrapper>
          {AVAILABILITY_OPTIONS.map(item => (
            <MenuRow
              key={item}
              label={item}
              active={selected === item}
              onPress={() => {
                onFilterChange('status', item)
                setOpenMenu(null)
              }}
            />
          ))}
        </MenuWrapper>
      )
    }
    return null
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-lightBg dark:bg-darkBg`}>
      {/* Header */}
      <View style={tw`flex-row items-center bg-lightBg dark:bg-darkBg p-4 pb-2`}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={tw`w-12 items-center justify-center`}
        >
          <Feather name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[tw`flex-1 text-center font-display text-lg font-bold`, { color: colors.textPrimary }]}>
          Find a Tutor
        </Text>
        <View style={tw`w-12`} />
      </View>

      {/* Search Bar */}
      <View style={tw`px-4 py-3`}>
        <View style={tw`flex-row items-center bg-lightElevated dark:bg-darkElevated rounded-lg`}>
          <Feather name="search" size={24} color={colors.placeholder} style={tw`px-4`} />
          <TextInput
            placeholder="Search for tutors"
            placeholderTextColor={colors.placeholder}
            onChangeText={handleSearch}
            style={[tw`flex-1 h-12 text-base font-sans`, { color: colors.textPrimary }]}
          />
        </View>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw`px-3 py-1`}
      >
        {filterOptions.map(opt => (
          <TouchableOpacity
            key={opt}
            style={tw`flex-row items-center h-8 px-3 mr-3 bg-lightElevated dark:bg-darkElevated rounded-lg`}
            onPress={() => setOpenMenu(openMenu === opt ? null : opt)}
          >
            <Text style={[tw`font-sans text-sm font-medium mr-1`, { color: colors.textPrimary }]}>
              {opt}
            </Text>
            <Entypo name="chevron-down" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sub Menu */}
      {renderSubMenu()}

      {/* Tutor List */}
      <ScrollView contentContainerStyle={tw`pt-4 pb-6`}>
        {loading ? (
          <Text style={[tw`text-center mt-4 font-sans text-base`, { color: colors.textPrimary }]}>
            Loading...
          </Text>
        ) : (
          tutorProfiles.map(profile => {
            const rawImage = Array.isArray(profile.gallery) && profile.gallery[0]
            const imageUri =
              typeof rawImage === 'string' && rawImage.startsWith('/')
                ? `${backendUrl}${rawImage}`
                : (rawImage as string) || ''

            const subject = profile.category ?? '—'

            return (
              <TouchableOpacity
                key={profile.id}
                onPress={() => navigation.navigate('Profile', { id: profile.id })}
                activeOpacity={0.8}
                style={tw`flex-row items-center justify-between bg-lightBg dark:bg-darkBg px-4 py-2 mb-2`}
              >
                <View style={tw`flex-row items-center`}>
                  <Image
                    source={
                      imageUri
                        ? { uri: imageUri }
                        : { uri: 'https://via.placeholder.com/56x56.png?text=+' }
                    }
                    style={tw`w-14 h-14 rounded-full`}
                  />
                  <View style={tw`ml-4`}>
                    <Text
                      style={[tw`font-display text-base font-medium`, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {profile.name}
                    </Text>
                    <Text
                      style={[tw`font-sans text-sm`, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {subject}
                    </Text>
                  </View>
                </View>

                {/* ⭐ Ratings */}
                {profile.role === 'tutor' ? (
                  <TutorReviewsNative tutorId={(profile as any).user_id} showComments={false} />
                ) : (
                  <Text style={[tw`font-sans text-base`, { color: colors.textPrimary }]}>—</Text>
                )}
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
