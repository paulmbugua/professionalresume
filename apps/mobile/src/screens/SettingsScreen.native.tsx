import React from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useSettingsShared from '@shared/hooks/useSettings';

const SettingsMobile = () => {
  const navigation = useNavigation();
  const { hasProfile, activeSection, menuItems, handleMenuClick } = useSettingsShared({
    alertFn: (title, message) => Alert.alert(title, message),
    navigateFn: (destination) => navigation.navigate(destination as never), // cast if needed
  });

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'account':
        return <Text>Account Section</Text>;
      case 'manageProfile':
        return hasProfile ? <Text>Manage Profile Form</Text> : <Text>Create Profile Form</Text>;
      case 'certification':
        return <Text>Certification Settings</Text>;
      case 'help':
        return <Text>Help Center</Text>;
      case 'language':
        return <Text>Language Settings</Text>;
      default:
        return <Text>Account Details</Text>;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Back Button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={{ padding: 10, backgroundColor: 'pink', margin: 10, borderRadius: 5 }}
      >
        <Text>Back</Text>
      </TouchableOpacity>
      {/* Menu Header (could be a horizontal scroll or a drawer) */}
      <ScrollView horizontal style={{ backgroundColor: '#8A2BE2', paddingVertical: 10 }}>
        {menuItems.map(item => (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleMenuClick(item)}
            style={{ marginHorizontal: 10, opacity: item.disabled ? 0.5 : 1 }}
          >
            <Text style={{ color: 'white' }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Main Content */}
      <View style={{ flex: 1, padding: 20 }}>
        {renderActiveSection()}
      </View>
    </View>
  );
};

export default SettingsMobile;
