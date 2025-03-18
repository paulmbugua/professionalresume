// /apps/mobile/src/screens/SettingsScreen.native.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeNavigate } from '@shared/utils/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import {
  faChevronLeft,
  faUserCircle,
  faEdit,
  faCertificate,
  faQuestionCircle,
  faGlobe,
  faPowerOff,
} from '@fortawesome/free-solid-svg-icons';
import tw from 'twrnc';
import { useSettings } from '@shared/hooks/useSettings';

// You may also import your mobile-adapted components for AccountSection, ManageProfileForm, etc.
const AccountSection = () => <Text style={tw`text-white`}>Account Section</Text>;
const ManageProfileForm = () => <Text style={tw`text-white`}>Manage/Create Profile</Text>;
const CertificationSettings = () => <Text style={tw`text-white`}>Certification Settings</Text>;

const SettingsScreen = () => {
  const navigate = useSafeNavigate();
  const { activeSection, menuItems, handleMenuClick } = useSettings();

  // Render active section based on activeSection value.
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSection />;
      case 'manageProfile':
        return <ManageProfileForm />;
      case 'certification':
        return <CertificationSettings />;
      case 'help':
        return <Text style={tw`text-white`}>Help Center</Text>;
      case 'language':
        return <Text style={tw`text-white`}>Language Settings</Text>;
      default:
        return <Text style={tw`text-white`}>Account Details</Text>;
    }
  };

  return (
    <View style={tw`flex-1 bg-gray-900`}>
      {/* Header with Back Button */}
      <View style={tw`flex-row items-center justify-between p-4 bg-gray-800`}>
        <TouchableOpacity onPress={() => navigate('Home')} style={tw`flex-row items-center`}>
          <FontAwesomeIcon icon={faChevronLeft} style={tw`text-white mr-2`} size={24} />
          <Text style={tw`text-white text-lg`}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={tw`flex-1 p-4`}>
        <Text style={tw`text-3xl text-pink-300 font-extrabold text-center mb-6`}>
          {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
        </Text>
        {renderActiveSection()}
      </ScrollView>

      {/* Bottom Menu */}
      <View style={tw`bg-gradient-to-r from-purple-800 to-plum p-4 flex-row justify-around`}>
        {menuItems
          .filter(item => item.id !== 'logout')
          .map(item => (
            <TouchableOpacity
              key={item.id}
              onPress={() => handleMenuClick(item)}
              style={tw`items-center`}
              disabled={item.disabled}
            >
              <FontAwesomeIcon icon={item.icon} style={tw`text-white`} size={24} />
              <Text style={tw`text-xs text-white mt-1`}>{item.label}</Text>
            </TouchableOpacity>
          ))}
      </View>
    </View>
  );
};

export default SettingsScreen;
