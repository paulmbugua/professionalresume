import React from 'react'
import { View, Text } from 'react-native'
import ProfileGridNative from './ProfileGrid.native'
import type { MappedProfile, Profile } from '@mytutorapp/shared/types'
import tw from '../../tailwind'

// type-guards for gallery items
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

export interface HomePageProps {
  filteredProfiles: MappedProfile[]
  loading: boolean
}

const HomePageNative: React.FC<HomePageProps> = ({ filteredProfiles, loading }) => {
  // 1) Loading
  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-softGray`}>
        <Text style={tw`text-white`}>Loading tutor profiles...</Text>
      </View>
    )
  }

  // 2) No results
  if (filteredProfiles.length === 0) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-softGray px-4`}>
        <Text style={tw`text-white text-lg text-center`}>
          No tutors found.
        </Text>
      </View>
    )
  }

  // 3) Map MappedProfile → Profile
  const mappedProfiles: Profile[] = filteredProfiles.map((p) => {
    // normalize gallery → string[]
    const galleryUrls: string[] = (p.gallery ?? []).reduce<string[]>((acc, item) => {
      if (typeof item === 'string') {
        acc.push(item)
      } else if (isUriObject(item)) {
        acc.push(item.uri)
      } else if (isUrlObject(item)) {
        acc.push(item.url)
      }
      // skip anything else (e.g. File)
      return acc
    }, [])

    // ensure user_id/id are strings
    const rawUserId = p.user_id ?? p.id
    const rawId = p.id
    const userId = typeof rawUserId === 'string' ? rawUserId : String(rawUserId)
    const id = typeof rawId === 'string' ? rawId : String(rawId)

    return {
      user_id: userId,
      id,
      name: p.name || 'Unnamed',
      category: p.category || 'N/A',
      expertise: p.expertise || [],
      teachingStyle: p.teachingStyle || [],
      gallery: galleryUrls,
      status: p.status,
      role: p.role,
      // spread any other optional fields that Profile expects:
      // ...(p.age !== undefined ? { age: p.age } : {}),
      // ...(p.languages ? { languages: p.languages } : {}),
      // ...(p.languageFluency ? { languageFluency: p.languageFluency } : {}),
    }
  })

  // 4) Render
  return (
    <View style={tw`flex-1 bg-softGray`}>
      <ProfileGridNative profiles={mappedProfiles} />
    </View>
  )
}

export default HomePageNative
