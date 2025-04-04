import React from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';
import useAccountSection from '@shared/hooks/useAccountSection';
import Spinner from '../components/Spinner';

const AccountSectionScreen = () => {
  const navigation = useNavigation();
  const backendUrl = process.env.BACKEND_URL || ''; // Adjust accordingly

  // Mobile-specific alert and confirm functions.
  const alertFn = (message: string) => Alert.alert('Info', message);
  const confirmFn = async (message: string) => {
    return new Promise<boolean>((resolve) =>
      Alert.alert('Confirm', message, [
        { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
        { text: 'OK', onPress: () => resolve(true) },
      ])
    );
  };
  const navigateFn = (dest: string) => navigation.navigate(dest as never);

  const { 
    user,
    transactions,
    accountDetails,
    activeTab,
    loading,
    formData,
    ratingData,
    cancelReasons,
    setActiveTab,
    setFormData,
    setRatingData,
    handleCancelReasonChange,
    confirmCancelSession,
    handleAcceptSession,
    handleCancelSession,
    fetchDataByType,
    handleSessionCreation,
    handleCompletePending,
    handleConfirmComplete,
    handleReviewSubmission,
    handleCreateZoomLink,
  } = useAccountSection({ alertFn, confirmFn, navigateFn });

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <Spinner />
      </View>
    );
  }

  return (
    <ScrollView style={tw`flex-1 bg-gray-900 p-4`}>
      {/* Header Section */}
      <View style={tw`bg-gray-800 p-4 rounded-lg flex-row items-center gap-4`}>
        <Image
          source={{ uri: user?.profileImage || 'https://via.placeholder.com/150' }}
          style={tw`w-16 h-16 rounded-full`}
        />
        <View>
          <Text style={tw`text-white text-xl font-bold`}>{user?.name || 'User Name'}</Text>
          <Text style={tw`text-gray-300`}>{user?.email}</Text>
          {user?.tokens !== undefined && <Text style={tw`text-gray-300`}>Tokens: {user.tokens}</Text>}
        </View>
      </View>

      {/* Tabs Navigation */}
      <View style={tw`flex-row flex-wrap justify-around my-4 border-b border-gray-700 pb-2`}>
        {['overview', 'transactions', 'sessions', 'reviews', 'earnings'].map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={tw`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-600' : 'bg-gray-700'}`}
          >
            <Text style={tw`text-white`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={tw`my-4`}>
        {activeTab === 'overview' && (
          <Text style={tw`text-gray-300 text-center`}>Welcome to your account overview.</Text>
        )}
        {activeTab === 'transactions' && (
          <View>
            {transactions.map((tx: any) => (
              <View key={tx.id} style={tw`bg-gray-800 p-4 rounded-lg my-2`}>
                <Text style={tw`text-gray-300`}>Type: {tx.type}</Text>
                <Text style={tw`text-gray-300`}>Amount: ${Math.abs(tx.amount)}</Text>
                <Text style={tw`text-gray-300`}>Description: {tx.description || 'N/A'}</Text>
                <Text style={tw`text-gray-300`}>Date: {new Date(tx.date).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        )}
        {/* Additional tab contents would follow similar patterns */}
      </View>
    </ScrollView>
  );
};

export default AccountSectionScreen;
