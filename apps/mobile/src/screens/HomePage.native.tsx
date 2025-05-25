import React from 'react'
import { View, Text } from 'react-native'
import ProfileGridNative from './ProfileGrid.native'
import type { MappedProfile, Profile } from '@mytutorapp/shared/types'
import tw from '../../tailwind'

export interface HomePageProps {
  filteredProfiles: MappedProfile[]
  loading: boolean
}

const HomePageNative: React.FC<HomePageProps> = ({
  filteredProfiles,
  loading,
}) => {
  // 1) Loading
  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-softGray`}>
        <Text style={tw`text-white`}>Loading tutor profiles...</Text>
      </View>
    )
  }

  // 2) No results
  if (!loading && filteredProfiles.length === 0) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-softGray px-4`}>
        <Text style={tw`text-white text-lg text-center`}>
          No tutors found.
        </Text>
      </View>
    )
  }

  // 3) Normalize gallery URLs
  const mappedProfiles: Profile[] = filteredProfiles.map(p => {
    const urls = (p.gallery ?? [])
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof (item as any).uri === 'string') return (item as any).uri
        if (item && typeof (item as any).url === 'string') return (item as any).url
        return null
      })
      .filter((u): u is string => !!u)

    return {
      ...p,
      id: p.id ?? `anon-${Math.random().toString(36).slice(2, 9)}`,
      name: p.name || 'Unnamed',
      category: p.category || 'N/A',
      expertise:     p.expertise     || [],
      teachingStyle: p.teachingStyle || [],
      gallery: urls,
      status: p.status,
      role: p.role,
    }
  })

  // 4) Render only the grid
  return (
    <View style={tw`flex-1 bg-softGray`}>
      <ProfileGridNative profiles={mappedProfiles} />
    </View>
  )
}

export default HomePageNative
