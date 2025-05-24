// apps/mobile/src/screens/HomePage.native.tsx

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import NavbarNative from '../screens/Navbar.native';
import SidebarNative from '../screens/Sidebar.native';
import ProfileGridNative from '../screens/ProfileGrid.native';
import { useHomePage } from '@mytutorapp/shared/hooks';
import { MappedProfile, Profile } from '@mytutorapp/shared/types';
import tw from '../../tailwind';

const HomePageNative: React.FC = () => {
  const {
    filteredProfiles,
    loading,
    handleSearch,
    isSidebarOpen,
    setSidebarOpen,
    onFilterChange,
  } = useHomePage();

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-softGray`}>
        <Text style={tw`text-white`}>Loading tutor profiles...</Text>
      </View>
    );
  }

  const mappedProfiles: Profile[] = filteredProfiles.map(
    (p: MappedProfile): Profile => ({
      ...p,
      id: p.id ?? `anon-${Math.random().toString(36).slice(2, 9)}`,
      name: p.name || 'N/A',
      category: p.category || 'N/A',
      expertise: p.expertise || [],
      teachingStyle: p.teachingStyle || [],
      gallery: (p.gallery ?? [])
        .map(img => (typeof img === 'string' ? img : img?.url ?? ''))
        .filter(Boolean),
    })
  );

  return (
    <View style={tw`flex-1 bg-softGray`}>
      

      {/* Grid & Floating Filter Button */}
      <View style={tw`flex-1`}>
        <ProfileGridNative profiles={mappedProfiles} />

        {/* Floating Filter Button */}
        <TouchableOpacity
          style={tw`absolute bottom-6 right-6 bg-softPink p-3 rounded-full shadow-lg z-50`}
          onPress={() => setSidebarOpen(true)}
        >
          <FontAwesome name="filter" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Sidebar overlay */}
      {isSidebarOpen && (
        <View style={tw`absolute inset-0 flex-row z-40`}>
          {/* Sidebar panel */}
          <View style={tw`w-64 bg-plum`}>
            <SidebarNative onFilterChange={onFilterChange} />
          </View>
          {/* Backdrop to close */}
          <TouchableOpacity
            style={tw`flex-1 bg-black opacity-50`}
            onPress={() => setSidebarOpen(false)}
          />
        </View>
      )}
    </View>
  );
};

export default HomePageNative;
