import { useMemo, useEffect, FC } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image } from 'react-native';
import { FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as PropTypes from 'prop-types';
import debounce from 'lodash.debounce';
import { useNavbar } from '@mytutorapp/shared/hooks';
import logo from '../../assets/logo.png';
import tw from '../../tailwind'; // Import the tw instance

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
    <View style={tw`bg-plum px-6 py-4 shadow-lg`}>
      {/* Mobile Header */}
      <View style={tw`flex-row items-center justify-between mb-2`}>
        <View style={tw`flex-row items-center flex-1`}>
          <TouchableOpacity onPress={handleMenuToggle} style={tw`focus:outline-none`}>
            <FontAwesome name="bars" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogoClick} style={tw`ml-4 focus:outline-none`}>
            <Image source={logo} style={tw`h-14 w-auto`} resizeMode="contain" />
          </TouchableOpacity>
        </View>
        <View style={tw`flex-row items-center gap-3.5`}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Messages')} 
            style={tw`relative`}
          >
            <FontAwesome name="envelope" size={24} color="white" />
            {unreadMessagesCount > 0 && (
              <View style={tw`absolute top-0 right-0 bg-red-600 rounded-full px-1`}>
                <Text style={tw`text-white text-xs`}>{unreadMessagesCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              handleSettingsClick();
              navigation.navigate('Settings');
            }}
            style={tw`relative`}
          >
            <FontAwesome name="cog" size={24} color="white" />
            {showAlert && (
              <View style={tw`absolute top-0 right-0 bg-red-600 rounded-full px-1`}>
                <Text style={tw`text-white text-xs`}>!</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('BuyTokens')}>
            <FontAwesome5 name="coins" size={24} color="#FFD700" />
          </TouchableOpacity>
          {token ? (
            <TouchableOpacity onPress={handleLogout}>
              <Text style={tw`text-white`}>Logout</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={tw`text-white`}>Login</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={toggleLanguage}>
            <Text style={tw`text-white`}>{language}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mobile Search */}
      <View style={tw`bg-plum p-2`}>
        <View style={tw`flex-row`}>
          <TextInput
            placeholder="Search Tutors or Subjects..."
            value={searchTerm}
            onChangeText={handleInputChange}
            style={tw`flex-grow p-1 rounded-l-lg border border-softPink text-gray-800`}
            placeholderTextColor="#333"
          />
          <TouchableOpacity 
            onPress={handleButtonSearch} 
            style={tw`bg-softPink px-2 rounded-r-lg`}
          >
            <Text style={tw`text-white`}>Search</Text>
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