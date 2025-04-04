// /apps/mobile/src/components/Navbar.native.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useNavbar } from '@shared/hooks'; // Assumes your hook is pure now
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEnvelope, faCog, faCoins, faHome } from '@fortawesome/free-solid-svg-icons';

// Require the logo image from the assets directory.
const logo = require('../../assets/logo.png');

interface NavbarProps {
  onSearch?: (searchTerm: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearch }) => {
  const navigation = useNavigation();
  const {
    searchTerm,
    setSearchTerm,
    showAlert,
    unreadMessagesCount,
    language,
    toggleLanguage,
    handleSearch,
    handleLogout,
    handleSettingsClick,
  } = useNavbar(); // Call the pure hook without navigation options

  return (
    <View>
      <View style={{ 
          backgroundColor: '#6b21a8', 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingHorizontal: 16, 
          paddingVertical: 12, 
          shadowColor: '#000', 
          shadowOpacity: 0.3, 
          shadowOffset: { width: 0, height: 2 }, 
          elevation: 5 
        }}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Image source={logo} style={{ height: 40, width: 100, resizeMode: 'contain' }} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Messages')} 
            style={{ position: 'relative', marginHorizontal: 8 }}
          >
            <FontAwesomeIcon icon={faEnvelope} size={20} color="white" />
            {unreadMessagesCount > 0 && (
              <View style={{ 
                  position: 'absolute', 
                  top: 0, 
                  right: 0, 
                  backgroundColor: 'red', 
                  borderRadius: 50, 
                  paddingHorizontal: 4 
                }}>
                <Text style={{ fontSize: 10, color: 'white' }}>{unreadMessagesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              handleSettingsClick();
              navigation.navigate('Settings');
            }} 
            style={{ position: 'relative', marginHorizontal: 8 }}
          >
            <FontAwesomeIcon icon={faCog} size={20} color="white" />
            {showAlert && (
              <View style={{ 
                  position: 'absolute', 
                  top: 0, 
                  right: 0, 
                  backgroundColor: 'red', 
                  borderRadius: 50, 
                  paddingHorizontal: 4 
                }}>
                <Text style={{ fontSize: 10, color: 'white' }}>!</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => navigation.navigate('BuyTokens')}
            style={{ marginHorizontal: 8 }}
          >
            <FontAwesomeIcon icon={faCoins} size={24} color="gold" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => {
              handleLogout();
              navigation.navigate('Login');
            }}
            style={{ marginHorizontal: 8 }}
          >
            <Text style={{ color: 'white' }}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleLanguage} style={{ marginHorizontal: 8 }}>
            <Text style={{ color: 'white' }}>{language}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{ backgroundColor: '#6b21a8', padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            placeholder="Search Tutors or Subjects..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={{ flex: 1, padding: 8, backgroundColor: 'white', borderRadius: 4 }}
          />
          <TouchableOpacity
            onPress={handleSearch}
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
