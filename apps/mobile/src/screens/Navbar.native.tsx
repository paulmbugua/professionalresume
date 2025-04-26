import { useMemo, useEffect, FC } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image } from 'react-native';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as PropTypes from 'prop-types';

import debounce from 'lodash.debounce';
import { useNavbar } from '@mytutorapp/shared/hooks';
import logo from '../../assets/logo.png';

// Define the navigation parameter list for your app
type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Messages: undefined;
  Settings: undefined;
  BuyTokens: undefined;
};

// Type for the navigation prop in this screen
type NavigationProp = StackNavigationProp<RootStackParamList>;

interface NavbarProps {
  onSearch: (term: string) => void;
}

const NavbarNative: FC<NavbarProps> = ({ onSearch }) => {
  const navigation = useNavigation<NavigationProp>();

  const {
    token,
    searchTerm,
    setSearchTerm,
    showAlert,
    unreadMessagesCount,
    language,
    toggleLanguage,
    handleLogout,
    handleLogoClick,
    handleSettingsClick,
  } = useNavbar({
    onLogout: () => navigation.navigate('Login'),
    onLogoClick: () => navigation.navigate('Home'),
  });

  const debouncedSearch = useMemo(
    () =>
      debounce(() => {
        onSearch(searchTerm);
      }, 300),
    [onSearch, searchTerm],
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleInputChange = (text: string) => {
    setSearchTerm(text);
    debouncedSearch();
  };

  const handleButtonSearch = () => {
    debouncedSearch.cancel();
    onSearch(searchTerm);
  };

  const handleMenuToggle = () => {
    console.log('Hamburger clicked');
  };

  return (
    <View className="bg-plum px-6 py-4 shadow-lg">
      {/* Mobile Header */}
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={handleMenuToggle} className="focus:outline-none">
            <FontAwesome name="bars" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogoClick} className="ml-4 focus:outline-none">
            <Image source={logo} className="h-14 w-auto" resizeMode="contain" />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center space-x-3.5">
          <TouchableOpacity onPress={() => navigation.navigate('Messages')} className="relative">
            <FontAwesome name="envelope" size={24} color="white" />
            {unreadMessagesCount > 0 && (
              <View className="absolute top-0 right-0 bg-red-600 rounded-full px-1">
                <Text className="text-white text-xs">{unreadMessagesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              handleSettingsClick();
              navigation.navigate('Settings');
            }}
            className="relative"
          >
            <FontAwesome name="cog" size={24} color="white" />
            {showAlert && (
              <View className="absolute top-0 right-0 bg-red-600 rounded-full px-1">
                <Text className="text-white text-xs">!</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('BuyTokens')}>
            <FontAwesome5 name="coins" size={24} color="#FFD700" />
          </TouchableOpacity>
          {token ? (
            <TouchableOpacity onPress={handleLogout}>
              <Text className="text-white">Logout</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text className="text-white">Login</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={toggleLanguage}>
            <Text className="text-white">{language}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mobile Search */}
      <View className="bg-plum p-2">
        <View className="flex-row">
          <TextInput
            placeholder="Search Tutors or Subjects..."
            value={searchTerm}
            onChangeText={handleInputChange}
            className="flex-grow p-1 rounded-l-lg border border-softPink text-gray-800"
            placeholderTextColor="#333"
          />
          <TouchableOpacity onPress={handleButtonSearch} className="bg-softPink px-2 rounded-r-lg">
            <Text className="text-white">Search</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

NavbarNative.propTypes = {
  onSearch: PropTypes.func.isRequired,
};

export default NavbarNative;
