import React, { useMemo, useEffect, FC } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, SafeAreaView, Platform } from 'react-native';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as PropTypes from 'prop-types';
import debounce from 'lodash.debounce';
import { useNavbar } from '@mytutorapp/shared/hooks';
import logo from '../../assets/logo.png';
import tw from '../../tailwind';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Messages: undefined;
  Settings: undefined;
  BuyTokens: undefined;
};

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
    [onSearch, searchTerm]
  );

  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const handleInputChange = (text: string) => {
    setSearchTerm(text);
    debouncedSearch();
  };

  const handleButtonSearch = () => {
    debouncedSearch.cancel();
    onSearch(searchTerm);
  };

  const handleMenuToggle = () => console.log('Hamburger clicked');

  return (
    <SafeAreaView style={tw`bg-plum ${Platform.OS === 'ios' ? 'pt-6' : ''}`}>  
      <View style={tw`px-6 py-4 flex-row items-center justify-between shadow-lg`}>      
        {/* Left: menu & logo */}
        <View style={tw`flex-row items-center`}>  
          <TouchableOpacity onPress={handleMenuToggle}>
            <FontAwesome name="bars" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogoClick} style={tw`ml-4`}>  
            <Image source={logo} style={tw`h-14 w-14`} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {/* Right: icons & auth */}
        <View style={tw`flex-row items-center`}>  
          <TouchableOpacity onPress={() => navigation.navigate('Messages')}>
            <FontAwesome name="envelope" size={24} color="white" />
            {unreadMessagesCount > 0 && (
              <View style={tw`absolute -top-1 -right-1 bg-red-600 rounded-full px-1`}>  
                <Text style={tw`text-white text-xs`}>{unreadMessagesCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { handleSettingsClick(); navigation.navigate('Settings'); }}
            style={tw`ml-4`}
          >  
            <FontAwesome name="cog" size={24} color="white" />
            {showAlert && (
              <View style={tw`absolute -top-1 -right-1 bg-red-600 rounded-full px-1`}>  
                <Text style={tw`text-white text-xs`}>!</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('BuyTokens')} style={tw`ml-4`}>  
            <FontAwesome5 name="coins" size={24} color="#FFD700" />
          </TouchableOpacity>

          {token ? (
            <TouchableOpacity onPress={handleLogout} style={tw`ml-4`}>  
              <Text style={tw`text-white font-medium`}>Logout</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={tw`ml-4`}>  
              <Text style={tw`text-white font-medium`}>Login</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={toggleLanguage} style={tw`ml-4`}>  
            <Text style={tw`text-white font-medium`}>{language}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={tw`bg-plum px-6 pb-4`}>  
        <View style={tw`flex-row`}>  
          <TextInput
            placeholder="Search Tutors or Subjects..."
            value={searchTerm}
            onChangeText={handleInputChange}
            style={[
              tw`flex-grow p-2 rounded-l-lg border border-softPink`,
              { color: 'rgba(255,255,255,0.6)' },
            ]}
            placeholderTextColor="rgba(255,255,255,0.6)"
          />
          <TouchableOpacity
            onPress={handleButtonSearch}
            style={tw`bg-softPink px-4 rounded-r-lg justify-center items-center`}
          >
            <Text style={tw`text-white font-semibold`}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

NavbarNative.propTypes = {
  onSearch: PropTypes.func.isRequired,
};

export default NavbarNative;
