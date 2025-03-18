// /apps/mobile/src/screens/AccountSection.native.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeNavigate, useSafeRoute } from '@shared/utils/navigation';
import Spinner from './Spinner.native'; // a native spinner component
import useAccountSection from '@shared/hooks/useAccountSection';

const AccountSection = () => {
  // For mobile, assume you get backendUrl and token from environment/context.
  // These are now handled inside the hook, so we no longer pass them.
  const navigate = useSafeNavigate();
  const route = useSafeRoute();
  
  // Use our shared hook to get account data and actions.
  const account = useAccountSection();

  // Local UI state for tabs, forms, rating modal, etc.
  const [activeTab, setActiveTab] = useState('overview');
  const [formData, setFormData] = useState({
    tutorId: '',
    subject: '',
    date: '',
    comment: '',
    rating: '',
    sessionType: '',
    sessionCost: '',
    pricing: {},
    tutorName: '',
  });
  const [ratingData, setRatingData] = useState({ tutorId: '', sessionId: '', rating: '', comment: '' });
  const [cancelReasons, setCancelReasons] = useState<{ [key: string]: string }>({});
  const [showRatingModal, setShowRatingModal] = useState(false);

  // Handlers that wrap our actions
  const handleAcceptSession = (sessionId: string) => {
    account.handleAcceptSession(sessionId);
  };

  // We call the hook's cancelSession with just the sessionId.
  const handleCancelSession = (sessionId: string, role: string, status: string) => {
    const reason = cancelReasons[sessionId] || '';
    if (!reason.trim()) {
      alert('Please provide a reason for cancellation.');
      return;
    }
    // Call the hook's cancelSession method with sessionId.
    account.handleCancelSession(sessionId);
  };

  if (account.loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, backgroundColor: '#1F2937' }}>
      {/* Header Section */}
      <View style={{ backgroundColor: '#374151', padding: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        {account.user?.role !== 'student' && (
          <Image
            source={{ uri: account.user?.profileImage || 'https://example.com/default-avatar.jpg' }}
            style={{ width: 80, height: 80, borderRadius: 40 }}
          />
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#3B82F6' }}>
            {account.user?.name || 'User Name'}
          </Text>
          <Text style={{ color: '#9CA3AF' }}>{account.user?.email}</Text>
          {account.user?.role === 'student' && (
            <Text style={{ color: '#D1D5DB' }}>Tokens: {account.user.tokens}</Text>
          )}
        </View>
      </View>

      {/* Tabs Navigation */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 24, borderBottomWidth: 1, borderColor: '#374151', paddingBottom: 8 }}>
        {['overview', 'transactions'].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 4,
              backgroundColor: activeTab === tab ? '#3B82F6' : '#374151',
              margin: 4,
            }}
          >
            <Text style={{ color: '#fff', textTransform: 'capitalize' }}>{tab}</Text>
          </TouchableOpacity>
        ))}
        {account.user?.role === 'student' &&
          ['sessions', 'reviews'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 4,
                backgroundColor: activeTab === tab ? '#3B82F6' : '#374151',
                margin: 4,
              }}
            >
              <Text style={{ color: '#fff', textTransform: 'capitalize' }}>{tab}</Text>
            </TouchableOpacity>
          ))}
        {account.user?.role === 'tutor' &&
          ['sessions', 'earnings'].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 4,
                backgroundColor: activeTab === tab ? '#3B82F6' : '#374151',
                margin: 4,
              }}
            >
              <Text style={{ color: '#fff', textTransform: 'capitalize' }}>{tab}</Text>
            </TouchableOpacity>
          ))}
      </View>

      {/* Tab Content */}
      <View style={{ marginTop: 24, paddingBottom: 64 }}>
        {activeTab === 'overview' && (
          <Text style={{ color: '#9CA3AF', fontSize: 18, textAlign: 'center' }}>
            Welcome to your account overview.
          </Text>
        )}

        {activeTab === 'transactions' && (
          <View style={{ gap: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#3B82F6' }}>
              Transaction History
            </Text>
            {account.transactions.length > 0 ? (
              account.transactions.map((transaction: any) => (
                <View key={transaction.id} style={{ backgroundColor: '#374151', padding: 16, borderRadius: 8 }}>
                  <Text style={{ color: '#9CA3AF' }}>Type: {transaction.type}</Text>
                  <Text style={{ color: '#9CA3AF' }}>Amount: ${Math.abs(transaction.amount)}</Text>
                  <Text style={{ color: '#9CA3AF' }}>
                    {transaction.amount > 0 ? 'Earning' : 'Deduction'}
                  </Text>
                  <Text style={{ color: '#9CA3AF' }}>
                    Description: {transaction.description || 'N/A'}
                  </Text>
                  <Text style={{ color: '#9CA3AF' }}>
                    Date: {new Date(transaction.date).toLocaleDateString()}
                  </Text>
                  <Text style={{ color: '#9CA3AF' }}>
                    Status: {transaction.status || 'N/A'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: '#6B7280' }}>No transactions found.</Text>
            )}
          </View>
        )}

        {/* Additional tab content for sessions, reviews, earnings would follow a similar pattern */}
      </View>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#374151', padding: 24, borderRadius: 8, width: '90%', maxWidth: 400 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 16 }}>
              Rate Your Tutor
            </Text>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: '#9CA3AF', marginBottom: 4 }}>Rating (1-5):</Text>
              <TextInput
                keyboardType="numeric"
                value={ratingData.rating}
                onChangeText={(text) => setRatingData({ ...ratingData, rating: text })}
                style={{ width: '100%', padding: 12, borderRadius: 4, backgroundColor: '#1F2937', color: '#fff' }}
              />
            </View>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: '#9CA3AF', marginBottom: 4 }}>Comment:</Text>
              <TextInput
                multiline
                value={ratingData.comment}
                onChangeText={(text) => setRatingData({ ...ratingData, comment: text })}
                style={{ width: '100%', padding: 12, borderRadius: 4, backgroundColor: '#1F2937', color: '#fff' }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setShowRatingModal(false)}
                style={{ backgroundColor: '#4B5563', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 4 }}
              >
                <Text style={{ color: '#fff' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  alert('Review submitted!');
                  setShowRatingModal(false);
                }}
                style={{ backgroundColor: '#EC4899', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 4 }}
              >
                <Text style={{ color: '#fff' }}>Submit Rating</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default AccountSection;
