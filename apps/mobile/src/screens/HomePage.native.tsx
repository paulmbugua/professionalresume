// apps/mobile/src/screens/HomePage.native.tsx

import React, { useCallback } from 'react'
import { View, Text } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { Profile } from '@mytutorapp/shared/types'
import { useHomePage } from '@mytutorapp/shared/hooks'
import ProfileGridNative from '../screens/ProfileGrid.native'
import tw from '../../tailwind'

// Type‐guards for gallery items
function isUriObject(item: unknown): item is { uri: string } {
  return (
    typeof item === 'object' &&
    item !== null &&
    'uri' in item &&
    typeof (item as any).uri === 'string'
  )
}
function isUrlObject(item: unknown): item is { url: string } {
  return (
    typeof item === 'object' &&
    item !== null &&
    'url' in item &&
    typeof (item as any).url === 'string'
  )
}

export default function HomePageNative() {
  const {
    filteredProfiles,
    loading,
    reloadProfiles,
  } = useHomePage()

  // Re-fetch profiles whenever this screen gains focus
  useFocusEffect(
    useCallback(() => {
      reloadProfiles()
    }, [reloadProfiles])
  )

  // Loading state
  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-softGray`}>
        <Text style={tw`text-white`}>Loading tutor profiles...</Text>
      </View>
    )
  }

  // No results
  if (filteredProfiles.length === 0) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-softGray px-4`}>
        <Text style={tw`text-white text-lg text-center`}>
          No tutors found.
        </Text>
      </View>
    )
  }

  // Map MappedProfile → Profile
  const mappedProfiles: Profile[] = filteredProfiles.map((p) => {
    const galleryUrls: string[] = (p.gallery ?? []).reduce<string[]>((acc, item) => {
      if (typeof item === 'string') {
        acc.push(item)
      } else if (isUriObject(item)) {
        acc.push(item.uri)
      } else if (isUrlObject(item)) {
        acc.push(item.url)
      }
      return acc
    }, [])

    const rawUserId = p.user_id ?? p.id
    const rawId = p.id
    const userId = typeof rawUserId === 'string' ? rawUserId : String(rawUserId)
    const id     = typeof rawId     === 'string' ? rawId     : String(rawId)

    return {
      user_id:      userId,
      id,
      name:         p.name || 'Unnamed',
      category:     p.category || 'N/A',
      expertise:    p.expertise || [],
      teachingStyle:p.teachingStyle || [],
      gallery:      galleryUrls,
      status:       p.status,
      role:         p.role,
    }
  })

  // Render the grid
  return (
    <View style={tw`flex-1 bg-softGray`}>
      <ProfileGridNative profiles={mappedProfiles} />
    </View>
  )
}
