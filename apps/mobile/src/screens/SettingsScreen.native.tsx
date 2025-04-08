import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ToastAndroid, Platform } from 'react-native';
import { useNavigation, useRoute, NavigationProp } from '@react-navigation/native';
import tw from 'twrnc';
import { FontAwesome } from '@expo/vector-icons';
import CreateProfileForm from '../screens/CreateProfileForm.native';
import ManageProfileForm from '../screens/ManageProfileForm.native';
import AccountSection from '../screens/AccountSection.native';
import CertificationSettings from '../screens/CertificationSettings.native';
import Footer from '../screens/Footer.native';
import { useSettings } from '@shared/hooks';

type RootStackParamList = {
  Home: undefined;
  // Add additional routes if needed
};

const showToast = (message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    Alert.alert('', message);
  }
};

// Use the glyphMap keys so that the return type is the union of valid icon names
const getIconName = (id: string): keyof typeof FontAwesome.glyphMap => {
  switch (id) {
    case 'account':
      return 'user-circle';
    case 'manageProfile':
      return 'edit';
    case 'certification':
      return 'certificate';
    case 'help':
      return 'question-circle';
    case 'language':
      return 'globe';
    case 'logout':
      return 'power-off';
    default:
      return 'user-circle';
  }
};

const SettingsNative = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute();
  const { success } = (route.params || {}) as { success?: string };
  const paymentSuccess = success === 'true';

  useEffect(() => {
    if (paymentSuccess) {
      showToast('Payment was successful! Your tokens have been updated.');
    }
  }, [paymentSuccess]);

  const { hasProfile, activeSection, menuItems, handleMenuClick } = useSettings({
    alertFn: (title: string, message: string) => showToast(`${title}: ${message}`),
    navigateFn: (destination: string) => navigation.navigate(destination as keyof RootStackParamList),
  });

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSection />;
      case 'manageProfile':
        return hasProfile ? <ManageProfileForm /> : <CreateProfileForm />;
      case 'certification':
        return <CertificationSettings />;
      case 'help':
        return (
          <View>
            <Text style={tw`text-white`}>Help Center</Text>
          </View>
        );
      case 'language':
        return (
          <View>
            <Text style={tw`text-white`}>Language Settings</Text>
          </View>
        );
      default:
        return (
          <View>
            <Text style={tw`text-white`}>Account Details</Text>
          </View>
        );
    }
  };

  return (
    <View style={tw`flex-1 bg-gray-900 relative`}>
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Home')}
        style={tw`absolute top-6 left-6 bg-pink-500 py-2 px-4 rounded-full shadow-lg flex-row items-center z-50`}
      >
        <FontAwesome name="chevron-left" size={16} color="white" />
        <Text style={tw`text-white ml-2`}>Back</Text>
      </TouchableOpacity>

      {/* Main Content */}
      <ScrollView contentContainerStyle={tw`pt-20 p-6 bg-gray-900 flex-grow`}>
        <Text style={tw`text-3xl font-extrabold text-pink-300 mb-8 text-center`}>
          {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
        </Text>
        {renderActiveSection()}
      </ScrollView>

      {/* Mobile Footer / Bottom Navigation */}
      <View style={tw`absolute bottom-0 left-0 right-0 bg-gradient-to-r from-purple-700 to-purple-900 p-4 shadow-lg`}>
        <View style={tw`flex-row justify-around`}>
          {menuItems
            .filter(item => item.id !== 'logout')
            .map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() =>
                  handleMenuClick({
                    ...item,
                    // If icon isn’t already provided, compute it using getIconName
                    icon: item.icon ? item.icon : getIconName(item.id),
                  })
                }
                style={tw`flex flex-col items-center`}
                disabled={item.disabled ?? false}
              >
                <FontAwesome
                  name={getIconName(item.id)}
                  size={24}
                  color={item.disabled ? 'gray' : '#EC4899'}
                />
                <Text style={tw`text-xs font-medium mt-1 ${item.disabled ? 'text-gray-500' : 'text-pink-400'}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      </View>

      <Footer />
    </View>
  );
};

export default SettingsNative;
