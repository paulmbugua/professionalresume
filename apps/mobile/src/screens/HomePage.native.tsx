import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import NavbarNative from '../screens/Navbar.native';
import SidebarNative from '../screens/Sidebar.native';
import ProfileGridNative from '../screens/ProfileGrid.native';
import FooterNative from '../screens/Footer.native';
import { useHomePage } from '@mytutorapp/shared/hooks';
import { MappedProfile, Profile } from '@mytutorapp/shared/types';

const HomePageNative = () => {
  const { filteredProfiles, loading, isSidebarOpen, setSidebarOpen, handleSearch, onFilterChange } =
    useHomePage();

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-softGray">
        <Text className="text-white">Loading tutor profiles...</Text>
      </View>
    );
  }

  // Map profiles to ensure required properties are defined using the shared MappedProfile type,
  // and explicitly return a Profile so that id is guaranteed to be a string.
  const mappedProfiles: Profile[] = filteredProfiles.map(
    (profile: MappedProfile): Profile => ({
      ...profile,
      id: profile.id ?? `default-id-${Math.random().toString(36).substr(2, 9)}`,
      name: profile.name || 'N/A',
      category: profile.category || 'N/A',
      expertise: profile.expertise || [],
      teachingStyle: profile.teachingStyle || [],
      gallery: profile.gallery
        ? profile.gallery
            .map((image): string => {
              if (!image) return '';
              if (typeof image === 'string') return image;
              if ('url' in image && typeof image.url === 'string') return image.url;
              return '';
            })
            .filter((url: string) => url !== '')
        : [],
    })
  );

  return (
    <View className="flex-1 bg-softGray">
      {/* Top Navbar with Search */}
      <NavbarNative onSearch={handleSearch} />

      {/* Sidebar Toggle Button for Mobile */}
      <TouchableOpacity
        onPress={() => setSidebarOpen(!isSidebarOpen)}
        className="absolute top-4 left-4 z-30 bg-plum p-2 rounded-lg shadow-lg"
      >
        <FontAwesome name={isSidebarOpen ? 'times' : 'bars'} size={24} color="white" />
      </TouchableOpacity>

      {/* Main Content Area */}
      <View className="flex-1 flex-row">
        {/* Sidebar Overlay */}
        {isSidebarOpen && (
          <View className="absolute inset-y-0 left-0 z-20 w-64 bg-plum shadow-xl rounded-r-lg">
            <SidebarNative onFilterChange={onFilterChange} />
          </View>
        )}

        {/* Profile Grid and Footer */}
        <View className="flex-1 p-6">
          <ProfileGridNative profiles={mappedProfiles} />
          <FooterNative />
        </View>
      </View>

      {/* Overlay to close sidebar on mobile */}
      {isSidebarOpen && (
        <TouchableOpacity
          onPress={() => setSidebarOpen(false)}
          className="absolute inset-0 bg-black opacity-50 z-10"
        />
      )}
    </View>
  );
};

export default HomePageNative;
