import { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import Spinner from './Spinner.native';
import { useAccountSection } from '@mytutorapp/shared/hooks';
import debounce from 'lodash.debounce';
import type { SessionType, User, EarningType } from '@mytutorapp/shared/types';

// Navigation parameter types
type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Account: undefined;
  ProfileDetail: { id: string };
  Messages: { studentId?: string };
  Settings: undefined;
  SettingsCreate: undefined;
  SettingsManage: undefined;
  SettingsAccount: undefined;
  CookiePolicy: undefined;
  BuyTokens: undefined;
};

type NoParamsRoutes = {
  [K in keyof RootStackParamList]: RootStackParamList[K] extends undefined ? K : never;
}[keyof RootStackParamList];

type TabType = 'overview' | 'transactions' | 'sessions' | 'reviews' | 'earnings';

const allowedRoutes: NoParamsRoutes[] = [
  'Home',
  'Login',
  'Account',
  'Settings',
  'SettingsCreate',
  'SettingsManage',
  'SettingsAccount',
  'CookiePolicy',
  'BuyTokens',
];

const isSessionType = (session: unknown): session is SessionType => {
  const s = session as Record<string, unknown>;
  const hasSessionType = typeof s.session_type === 'string' || typeof s.sessionType === 'string';
  const amountValid =
    typeof s.amount === 'number' || (typeof s.amount === 'string' && !isNaN(Number(s.amount)));
  return hasSessionType && amountValid && typeof s.date === 'string';
};

const isEarningType = (earning: unknown): earning is EarningType => {
  const e = earning as Record<string, unknown>;
  return (
    typeof e.amount === 'number' &&
    typeof e.description === 'string' &&
    typeof e.createdAt === 'string'
  );
};

const AccountSectionNative = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const queryParams = useMemo(() => new URLSearchParams(''), []);

  const alertFn = (msg: string) => {
    Alert.alert('Alert', msg);
  };

  const confirmFn = async (msg: string): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert('Confirm', msg, [
        { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
        { text: 'OK', onPress: () => resolve(true) },
      ]);
    });
  };

  const navigateFn = (destination: string) => {
    if (allowedRoutes.includes(destination as NoParamsRoutes)) {
      navigation.navigate(destination as NoParamsRoutes, undefined);
    } else {
      console.error(`Invalid destination: ${destination}`);
    }
  };

  const hookResult = useAccountSection({
    alertFn,
    confirmFn,
    navigateFn,
    queryParams,
  });

  const {
    loading,
    user,
    transactions,
    accountDetails,
    role,
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    cancelReasons,
    handleAcceptSession,
    handleCancelSession,
    handleSessionCreation,
    handleCompletePending,
    handleConfirmComplete,
    handleReviewSubmission,
    setShowRatingModal,
    showRatingModal,
    ratingData,
    setRatingData,
    handleCreateZoomLink,
    handleCancelReasonChange,
    confirmCancelSession,
  } = hookResult as typeof hookResult & {
    user: User | null;
    activeTab: TabType;
    setActiveTab: (tab: TabType) => void;
  };

  const debouncedReviewSubmission = useMemo(
    () => debounce(() => handleReviewSubmission(), 300),
    [handleReviewSubmission]
  );

  useEffect(() => {
    return () => {
      debouncedReviewSubmission.cancel();
    };
  }, [debouncedReviewSubmission]);

  const sessionData: SessionType[] = Array.isArray(accountDetails.session)
    ? (accountDetails.session as unknown[]).filter(isSessionType)
    : [];
  const earningData: EarningType[] = Array.isArray(accountDetails.earning)
    ? (accountDetails.earning as unknown[]).filter(isEarningType)
    : [];

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Spinner />
      </View>
    );
  }

  return (
    <ScrollView className="bg-gray-900 p-4 pb-16" contentContainerClassName="pb-10">
      {/* Header */}
      <View className="bg-gray-800 p-6 rounded-lg shadow-lg flex-row items-center mb-4">
        {role !== 'student' && (
          <Image
            source={{ uri: user?.profileImage || 'https://example.com/default-avatar.jpg' }}
            className="w-20 h-20 rounded-full mr-4"
          />
        )}
        <View className="flex-1">
          <Text className="text-2xl font-bold text-blue-400">{user?.name || 'User Name'}</Text>
          <Text className="text-gray-400">{user?.email}</Text>
          {role === 'student' && <Text className="text-gray-300">Tokens: {user?.tokens}</Text>}
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row flex-wrap justify-center border-b border-gray-700 pb-2 mb-4">
        <TouchableOpacity onPress={() => setActiveTab('overview')}>
          <Text className={activeTab === 'overview' ? 'text-white' : 'text-gray-400'}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('transactions')}>
          <Text className={activeTab === 'transactions' ? 'text-white' : 'text-gray-400'}>
            Transactions
          </Text>
        </TouchableOpacity>
        {role === 'student' && (
          <>
            <TouchableOpacity onPress={() => setActiveTab('sessions')}>
              <Text className={activeTab === 'sessions' ? 'text-white' : 'text-gray-400'}>
                Sessions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('reviews')}>
              <Text className={activeTab === 'reviews' ? 'text-white' : 'text-gray-400'}>
                Reviews
              </Text>
            </TouchableOpacity>
          </>
        )}
        {role === 'tutor' && (
          <>
            <TouchableOpacity onPress={() => setActiveTab('sessions')}>
              <Text className={activeTab === 'sessions' ? 'text-white' : 'text-gray-400'}>
                Sessions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('earnings')}>
              <Text className={activeTab === 'earnings' ? 'text-white' : 'text-gray-400'}>
                Earnings
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Content */}
      <View>
        {activeTab === 'overview' && (
          <Text className="text-gray-400 text-lg text-center">
            Welcome to your account overview.
          </Text>
        )}

        {activeTab === 'transactions' && (
          <View>
            <Text className="text-xl font-semibold text-blue-400 text-center mb-2">
              Transaction History
            </Text>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <View key={transaction.id} className="bg-gray-800 p-4 rounded-lg shadow-md mb-4">
                  <Text className="text-gray-300">Type: {transaction.type}</Text>
                  <Text className="text-gray-300">Amount: ${Math.abs(transaction.amount)}</Text>
                  <Text className="text-gray-300">
                    {transaction.amount > 0 ? 'Earning' : 'Deduction'}
                  </Text>
                  <Text className="text-gray-300">
                    Description: {transaction.description || 'N/A'}
                  </Text>
                  <Text className="text-gray-300">
                    Date: {new Date(transaction.date ?? Date.now()).toLocaleDateString()}
                  </Text>
                  <Text className="text-gray-300">Status: {transaction.status || 'N/A'}</Text>
                </View>
              ))
            ) : (
              <Text className="text-gray-500 text-center">No transactions found.</Text>
            )}
          </View>
        )}

        {activeTab === 'sessions' && (
          <>
            {role === 'student' && (
              <>
                <View className="bg-gray-800 p-6 rounded-lg shadow-md mb-4">
                  <View className="bg-yellow-100 border-l-4 border-yellow-500 p-2 rounded mb-4">
                    <Text className="text-yellow-700 text-sm">
                      To create a session, visit the Homepage, select a tutor, and click their
                      profile image. Use the ‘Create Session’ button for prefilled details.
                    </Text>
                  </View>
                  <Text className="text-lg font-semibold mb-4 text-blue-400 text-center">
                    {formData.tutorName
                      ? `Session with Tutor ${formData.tutorName}`
                      : 'Create a Session'}
                  </Text>
                  <TextInput
                    placeholder="Subject"
                    placeholderTextColor="#9CA3AF"
                    className="bg-gray-800 text-gray-300 p-2 rounded border border-gray-700 mb-2"
                    value={formData.subject}
                    onChangeText={(text) => setFormData({ ...formData, subject: text })}
                  />
                  <TextInput
                    placeholder="Session Type"
                    placeholderTextColor="#9CA3AF"
                    className="bg-gray-800 text-gray-300 p-2 rounded border border-gray-700 mb-2"
                    value={formData.sessionType || ''}
                    onChangeText={(text) => {
                      const sessionType = text;
                      const sessionCost = String(formData.pricing?.[sessionType] || 0);
                      setFormData({ ...formData, sessionType, sessionCost });
                    }}
                  />
                  <TextInput
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                    className="bg-gray-800 text-gray-300 p-2 rounded border border-gray-700 mb-2"
                    value={formData.date}
                    onChangeText={(text) => setFormData({ ...formData, date: text })}
                  />
                  <TouchableOpacity
                    className="bg-blue-500 py-2 rounded-lg mt-4"
                    onPress={handleSessionCreation}
                  >
                    <Text className="text-white text-center font-bold">Create Session</Text>
                  </TouchableOpacity>
                </View>

                <View className="mb-4">
                  <Text className="text-xl font-semibold text-blue-400 text-center mb-4">
                    Your Sessions
                  </Text>
                  {sessionData.length > 0 ? (
                    sessionData.map((session) => (
                      <View key={session.id} className="bg-gray-800 p-4 rounded-lg shadow-md mb-4">
                        <Text className="text-gray-300">
                          Tutor Name: {session.tutor_name || 'N/A'}
                        </Text>
                        <Text className="text-gray-300">
                          Session Type: {session.sessionType || 'N/A'}
                        </Text>
                        <Text className="text-gray-300">
                          Session Cost: Ksh {session.amount || 'N/A'}
                        </Text>
                        <Text className="text-gray-300">
                          Date: {new Date(session.date).toLocaleDateString() || 'N/A'}
                        </Text>
                        <Text className="text-gray-300">
                          Status:{' '}
                          {session.status
                            ? session.status.charAt(0).toUpperCase() + session.status.slice(1)
                            : 'N/A'}
                        </Text>
                        {session.status === 'accepted' &&
                          session.zoom_links &&
                          session.zoom_links.length > 0 && (
                            <View className="mt-2">
                              <Text className="text-green-500 font-semibold mb-1">
                                Zoom Links Created:
                              </Text>
                              {session.zoom_links.map((link, idx) => (
                                <TouchableOpacity key={link} onPress={() => Linking.openURL(link)}>
                                  <Text className="text-blue-400 underline">
                                    Join Meeting Part {idx + 1}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        {session.status === 'accepted' && (
                          <View className="mt-2">
                            <TextInput
                              placeholder="Reason for cancellation"
                              placeholderTextColor="#9CA3AF"
                              className="bg-gray-700 text-gray-300 p-3 rounded-lg border border-gray-600 mb-2"
                              multiline
                              value={cancelReasons[session.id] || ''}
                              onChangeText={(text) => handleCancelReasonChange(session.id, text)}
                            />
                            <TouchableOpacity
                              className="bg-red-500 py-2 rounded-lg"
                              onPress={() => confirmCancelSession(session.id, role, session.status)}
                            >
                              <Text className="text-white text-center font-bold">
                                Cancel Session
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {session.status === 'completed_pending' && (
                          <View className="mt-4">
                            <Text className="text-gray-400 text-center mb-2">
                              The tutor has marked this session as complete. Please confirm the
                              completion within 24 hours.
                            </Text>
                            <TouchableOpacity
                              className="bg-green-500 py-2 rounded-lg"
                              onPress={() => handleConfirmComplete(session.id)}
                            >
                              <Text className="text-white text-center font-bold">
                                Confirm Completion
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {session.status === 'completed' && (
                          <Text className="text-green-500 text-center font-semibold">
                            Session Completed
                          </Text>
                        )}
                        {session.status === 'cancelled' && (
                          <Text className="text-red-500 text-center">Session Cancelled</Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text className="text-gray-500 text-center">No sessions yet.</Text>
                  )}
                </View>
              </>
            )}

            {role === 'tutor' && (
              <View className="mb-4">
                <Text className="text-xl font-semibold text-blue-400 text-center mb-4">
                  Your Upcoming Sessions
                </Text>
                {sessionData.length > 0 ? (
                  sessionData.map((session) => (
                    <View key={session.id} className="bg-gray-800 p-4 rounded-lg shadow-md mb-4">
                      <View className="mb-2">
                        <Text className="text-gray-300">
                          Student Name: {session.student_name || 'N/A'}
                        </Text>
                        <Text className="text-gray-300">
                          Student ID: {session.student_id || 'N/A'}
                        </Text>
                      </View>
                      <View className="mb-2">
                        <Text className="text-gray-300">
                          Session Type: {session.sessionType || 'N/A'}
                        </Text>
                        <Text className="text-gray-300">
                          Session Cost: ${session.amount || 'N/A'}
                        </Text>
                        <Text className="text-gray-300">Subject: {session.subject || 'N/A'}</Text>
                        <Text className="text-gray-300">
                          Date: {new Date(session.date).toLocaleDateString() || 'N/A'}
                        </Text>
                      </View>
                      {session.status === 'upcoming' ? (
                        <View className="mt-2">
                          <TouchableOpacity
                            className="bg-green-500 py-2 rounded-lg mb-2"
                            onPress={() => handleAcceptSession(session.id)}
                          >
                            <Text className="text-white text-center font-bold">Accept Session</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="bg-red-500 py-2 rounded-lg mb-2"
                            onPress={() => handleCancelSession(session.id, role, session.status)}
                          >
                            <Text className="text-white text-center font-bold">Cancel Session</Text>
                          </TouchableOpacity>
                          <TextInput
                            placeholder="Reason for cancellation (if applicable)"
                            placeholderTextColor="#9CA3AF"
                            className="bg-gray-700 text-gray-300 p-3 rounded-lg border border-gray-600 mb-2"
                            multiline
                            value={cancelReasons[session.id] || ''}
                            onChangeText={(text) => handleCancelReasonChange(session.id, text)}
                          />
                        </View>
                      ) : session.status === 'accepted' ? (
                        <View className="mt-2">
                          <TouchableOpacity
                            className="bg-blue-500 py-2 rounded-lg mb-2"
                            onPress={() =>
                              navigation.navigate('Messages', { studentId: session.student_id })
                            }
                          >
                            <Text className="text-white text-center font-bold">
                              Chat with Student
                            </Text>
                          </TouchableOpacity>
                          {!session.zoom_links || session.zoom_links.length === 0 ? (
                            <TouchableOpacity
                              className="bg-yellow-500 py-2 rounded-lg mb-2"
                              onPress={() => {
                                const durationMapping: Record<string, number> = {
                                  privateSession: 60,
                                  groupSession: 90,
                                  lecture: 120,
                                  workshop: 180,
                                };
                                const duration =
                                  session.total_duration ||
                                  durationMapping[session.sessionType] ||
                                  40;
                                handleCreateZoomLink(
                                  session.id,
                                  session.subject ?? 'General',
                                  session.date,
                                  duration,
                                  session.tutor_name || 'Unknown Tutor'
                                );
                              }}
                            >
                              <Text className="text-white text-center font-bold">
                                Create Zoom Links
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View className="mt-2">
                              <Text className="text-green-500 font-semibold mb-1">
                                Zoom Links Created:
                              </Text>
                              {session.zoom_links.map((link, idx) => (
                                <TouchableOpacity key={link} onPress={() => Linking.openURL(link)}>
                                  <Text className="text-blue-400 underline">
                                    Join Meeting Part {idx + 1}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                          <TouchableOpacity
                            className="bg-purple-500 py-2 rounded-lg mt-2"
                            onPress={() => handleCompletePending(session.id)}
                          >
                            <Text className="text-white text-center font-bold">
                              Mark as Complete-Pending
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : session.status === 'completed_pending' ? (
                        <Text className="text-purple-500 text-center font-semibold mt-2">
                          Complete-Pending
                        </Text>
                      ) : session.status === 'completed' ? (
                        <Text className="text-green-500 text-center font-semibold mt-2">
                          Session Completed
                        </Text>
                      ) : (
                        <Text className="text-red-500 text-center mt-2">Session Cancelled</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text className="text-gray-500 text-center">No upcoming sessions found.</Text>
                )}
              </View>
            )}
          </>
        )}

        {activeTab === 'reviews' && (
          <View className="bg-gray-800 p-6 rounded-lg shadow-md mb-4">
            <Text className="text-xl font-semibold text-blue-400 mb-4 text-center">
              Post a Review
            </Text>
            <TextInput
              placeholder="Tutor ID"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-900 text-gray-300 p-3 rounded mb-2"
              onChangeText={(text) => setFormData({ ...formData, tutorId: text })}
            />
            <TextInput
              placeholder="Comment"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-900 text-gray-300 p-3 rounded mb-2"
              multiline
              onChangeText={(text) => setFormData({ ...formData, comment: text })}
            />
            <TextInput
              placeholder="Rating (1-5)"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-900 text-gray-300 p-3 rounded mb-2"
              keyboardType="numeric"
              onChangeText={(text) => setFormData({ ...formData, rating: text })}
            />
            <TouchableOpacity
              className="bg-blue-500 py-2 rounded-lg"
              onPress={() => debouncedReviewSubmission()}
            >
              <Text className="text-white text-center font-bold">Submit Review</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'earnings' && (
          <View>
            <Text className="text-xl font-semibold text-blue-400 text-center mb-4">
              Your Earnings
            </Text>
            {earningData.length > 0 ? (
              earningData.map((earning) => (
                <View key={earning.id} className="bg-gray-800 p-4 rounded-lg shadow-md mb-4">
                  <Text className="text-gray-300">Amount: ${earning.amount}</Text>
                  <Text className="text-gray-300">Description: {earning.description}</Text>
                  <Text className="text-gray-300">
                    Date: {new Date(earning.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))
            ) : (
              <Text className="text-gray-500 text-center">No earnings found.</Text>
            )}
          </View>
        )}
      </View>

      {showRatingModal && (
        <View className="absolute inset-0 bg-black bg-opacity-50 justify-center items-center z-50">
          <View className="bg-gray-800 p-6 rounded w-11/12 max-w-md">
            <Text className="text-xl font-bold text-white mb-4 text-center">Rate Your Tutor</Text>
            <View className="mb-4">
              <Text className="text-gray-300 mb-1">Rating (1-5):</Text>
              <TextInput
                className="bg-gray-700 text-white p-2 rounded w-full"
                keyboardType="numeric"
                value={ratingData.rating?.toString()}
                onChangeText={(text) => setRatingData({ ...ratingData, rating: text })}
              />
            </View>
            <View className="mb-4">
              <Text className="text-gray-300 mb-1">Comment:</Text>
              <TextInput
                className="bg-gray-700 text-white p-2 rounded w-full"
                multiline
                value={ratingData.comment}
                onChangeText={(text) => setRatingData({ ...ratingData, comment: text })}
              />
            </View>
            <View className="flex-row justify-end">
              <TouchableOpacity
                className="bg-gray-500 px-4 py-2 rounded mr-2"
                onPress={() => setShowRatingModal(false)}
              >
                <Text className="text-white">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-pink-500 px-4 py-2 rounded"
                onPress={handleReviewSubmission}
              >
                <Text className="text-white">Submit Rating</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default AccountSectionNative;
