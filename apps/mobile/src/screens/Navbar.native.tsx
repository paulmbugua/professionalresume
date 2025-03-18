// /apps/mobile/src/screens/Navbar.native.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image, TextInput, Button } from 'react-native';
import { useSafeNavigate } from "@shared/utils/navigation";
import { useNavbar } from '@shared/hooks/useNavbar';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEnvelope, faCog, faCoins } from '@fortawesome/free-solid-svg-icons';

// Directly require the logo image from the assets directory.
const logo = require('../../assets/logo.png');

interface NavbarProps {
  onSearch?: (searchTerm: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearch }) => {
  // useSafeNavigate returns a callable function.
  const navigate = useSafeNavigate();
  const {
    searchTerm,
    setSearchTerm,
    showAlert,
    unreadMessagesCount,
    language,
    toggleLanguage,
    handleSearch,
    handleLogout,
    handleLogoClick,
    handleSettingsClick,
  } = useNavbar();

  const handleSearchClick = () => {
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  return (
    <View>
      <View className="bg-plum flex-row items-center justify-between px-4 py-3 shadow-lg">
        <TouchableOpacity onPress={handleLogoClick}>
          <Image source={logo} style={{ height: 40, width: 100, resizeMode: 'contain' }} />
        </TouchableOpacity>
        <View className="flex-row items-center space-x-4">
          <TouchableOpacity onPress={() => navigate('Messages')}>
            <FontAwesomeIcon icon={faEnvelope} size={20} color="white" />
            {unreadMessagesCount > 0 && (
              <View className="absolute top-0 right-0 bg-red-600 rounded-full p-1">
                <Text className="text-xs text-white">{unreadMessagesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            handleSettingsClick();
            navigate('Settings');
          }}>
            <FontAwesomeIcon icon={faCog} size={20} color="white" />
            {showAlert && (
              <View className="absolute top-0 right-0 bg-red-600 rounded-full p-1">
                <Text className="text-xs text-white">!</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigate('BuyTokens')}>
            <FontAwesomeIcon icon={faCoins} size={24} color="gold" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text className="text-white">Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleLanguage}>
            <Text className="text-white">{language}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View className="bg-plum p-3">
        <View className="flex-row items-center">
          <TextInput
            placeholder="Search Tutors or Subjects..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={{ flex: 1, padding: 8, backgroundColor: 'white', borderRadius: 4 }}
          />
          <TouchableOpacity
            onPress={handleSearchClick}
            style={{ padding: 8, backgroundColor: '#A259FF', borderRadius: 4, marginLeft: 8 }}
          >
            <Text style={{ color: 'white' }}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default Navbar;
