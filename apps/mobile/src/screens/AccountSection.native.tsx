// apps/mobile/src/screens/AccountSection.native.tsx

import React, { useMemo, useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native'
import {
  useNavigation,
  useRoute,
  NavigationProp,
  RouteProp,
} from '@react-navigation/native'
import Spinner from './Spinner.native'
import { useAccountSection } from '@mytutorapp/shared/hooks'
import debounce from 'lodash.debounce'
import type { SessionType, User, EarningType } from '@mytutorapp/shared/types'
import tw from '../../tailwind'

// ➊ Pull in your global param list
import { MainStackParamList } from '../navigation/types'

// ➋ Picker & DateTimePicker for dropdowns
import { Picker } from '@react-native-picker/picker'
import DateTimePicker from '@react-native-community/datetimepicker'

// ➌ Tab key type
type TabType = 'overview' | 'transactions' | 'sessions' | 'reviews' | 'earnings'

// ➍ Runtime‐type guards
const isSessionType = (x: unknown): x is SessionType => {
  const s = x as any
  return (
    (typeof s.session_type === 'string' || typeof s.sessionType === 'string') &&
    (typeof s.amount === 'number' ||
      (typeof s.amount === 'string' && !isNaN(Number(s.amount)))) &&
    typeof s.date === 'string'
  )
}
const isEarningType = (x: unknown): x is EarningType => {
  const e = x as any
  return (
    typeof e.amount === 'number' &&
    typeof e.description === 'string' &&
    typeof e.createdAt === 'string'
  )
}

// ➎ Only these screen names get navigateFn
const allowedRoutes: (keyof MainStackParamList)[] = [
  'Home',
  'Login',
  'Account',
  'Profile',
  'Messages',
  'Settings',
  'SettingsCreate',
  'SettingsManage',
  'SettingsAccount',
  'CookiePolicy',
  'BuyTokens',
]

const AccountSectionNative: React.FC = () => {
  // ➏ Typed navigation + route
  const navigation = useNavigation<NavigationProp<MainStackParamList>>()
  const route      = useRoute<RouteProp<MainStackParamList, 'Account'>>()

  // ➐ Local state for date-picker
  const [showDatePicker, setShowDatePicker] = useState(false)

  // ➑ Build URLSearchParams from native route.params
  const queryParams = useMemo(() => {
    const p = route.params ?? {}
    const qp = new URLSearchParams()
    if (p.action)    qp.set('action', p.action)
    if (p.tutorId)   qp.set('tutorId', p.tutorId)
    if (p.tutorName) qp.set('tutorName', p.tutorName)
    if (p.subject)   qp.set('subject', p.subject)
    if (p.pricing)   qp.set('pricing', JSON.stringify(p.pricing))
    return qp
  }, [route.params])

  const alertFn = (msg: string) => Alert.alert('Alert', msg)
  const confirmFn = async (msg: string): Promise<boolean> =>
    new Promise((resolve) => {
      Alert.alert('Confirm', msg, [
        { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
        { text: 'OK',     onPress: () => resolve(true) },
      ])
    })

  // ➒ Unified navigator: screen + optional params
  const navigateFn = <T extends keyof MainStackParamList>(
    screen: T,
    params?: MainStackParamList[T]
  ) => {
    if (allowedRoutes.includes(screen)) {
      navigation.navigate(screen, params as any)
    } else {
      console.error(`Invalid destination: ${screen}`)
    }
  }

  // ➓ Hook drives data + actions
  const hookResult = useAccountSection({
    alertFn,
    confirmFn,
    navigateFn,
    queryParams,
  })

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
    user: User | null
    activeTab: TabType
    setActiveTab: (t: TabType) => void
  }

  const debouncedReviewSubmission = useMemo(
    () => debounce(() => handleReviewSubmission(), 300),
    [handleReviewSubmission]
  )
  useEffect(() => () => debouncedReviewSubmission.cancel(), [debouncedReviewSubmission])

  // Filter sessions/earnings
  const sessionData: SessionType[] = Array.isArray(accountDetails.session)
    ? (accountDetails.session as unknown[]).filter(isSessionType)
    : []
  const earningData: EarningType[] = Array.isArray(accountDetails.earning)
    ? (accountDetails.earning as unknown[]).filter(isEarningType)
    : []

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Spinner />
      </View>
    )
  }

  return (
    <View style={tw`flex-1 bg-gray-900 p-4 pb-16`}>
      {/* Header */}
      <View style={tw`bg-gray-800 p-6 rounded-lg shadow-lg flex-row items-center mb-4`}>
        {role !== 'student' && (
          <Image
            source={{
              uri: user?.profileImage ?? 'https://example.com/default-avatar.jpg',
            }}
            style={tw`w-20 h-20 rounded-full mr-4`}
          />
        )}
        <View style={tw`flex-1`}>
          <Text style={tw`text-2xl font-bold text-blue-400`}>
            {user?.name ?? 'User Name'}
          </Text>
          <Text style={tw`text-gray-400`}>{user?.email}</Text>
          {role === 'student' && (
            <Text style={tw`text-gray-300`}>Tokens: {user?.tokens}</Text>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={tw`flex-row flex-wrap justify-center border-b border-gray-700 pb-2 mb-4`}>
        <TouchableOpacity onPress={() => setActiveTab('overview')}>
          <Text style={activeTab === 'overview' ? tw`text-white` : tw`text-gray-400`}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('transactions')}>
          <Text style={activeTab === 'transactions' ? tw`text-white` : tw`text-gray-400`}>
            Transactions
          </Text>
        </TouchableOpacity>

        {role === 'student' && (
          <>
            <TouchableOpacity onPress={() => setActiveTab('sessions')}>
              <Text style={activeTab === 'sessions' ? tw`text-white` : tw`text-gray-400`}>
                Sessions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('reviews')}>
              <Text style={activeTab === 'reviews' ? tw`text-white` : tw`text-gray-400`}>
                Reviews
              </Text>
            </TouchableOpacity>
          </>
        )}

        {role === 'tutor' && (
          <>
            <TouchableOpacity onPress={() => setActiveTab('sessions')}>
              <Text style={activeTab === 'sessions' ? tw`text-white` : tw`text-gray-400`}>
                Sessions
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('earnings')}>
              <Text style={activeTab === 'earnings' ? tw`text-white` : tw`text-gray-400`}>
                Earnings
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Content */}
      <View>
        {activeTab === 'overview' && (
          <Text style={tw`text-gray-400 text-lg text-center`}>
            Welcome to your account overview.
          </Text>
        )}

        {activeTab === 'transactions' && (
          <View>
            <Text style={tw`text-xl font-semibold text-blue-400 text-center mb-2`}>
              Transaction History
            </Text>
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <View
                  key={tx.id}
                  style={tw`bg-gray-800 p-4 rounded-lg shadow-md mb-4`}
                >
                  <Text style={tw`text-gray-300`}>Type: {tx.type}</Text>
                  <Text style={tw`text-gray-300`}>Amount: ${Math.abs(tx.amount)}</Text>
                  <Text style={tw`text-gray-300`}>
                    {tx.amount > 0 ? 'Earning' : 'Deduction'}
                  </Text>
                  <Text style={tw`text-gray-300`}>
                    Desc: {tx.description || 'N/A'}
                  </Text>
                  <Text style={tw`text-gray-300`}>
                    Date: {new Date(tx.date ?? Date.now()).toLocaleDateString()}
                  </Text>
                  <Text style={tw`text-gray-300`}>
                    Status: {tx.status || 'N/A'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={tw`text-gray-500 text-center`}>No transactions found.</Text>
            )}
          </View>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <>
            {role === 'student' && (
              <View style={tw`bg-gray-800 p-6 rounded-lg shadow-md mb-4`}>
                <View style={tw`bg-yellow-100 border-l-4 border-yellow-500 p-2 rounded mb-4`}>
                  <Text style={tw`text-yellow-700 text-sm`}>
                    To create a session, visit the Homepage, select a tutor, and click their
                    profile image. Use the ‘Create Session’ button for prefilled details.
                  </Text>
                </View>

                <Text style={tw`text-lg font-semibold mb-4 text-blue-400 text-center`}>
                  {formData.tutorName
                    ? `Session with Tutor ${formData.tutorName}`
                    : 'Create a Session'}
                </Text>

                {/* Subject */}
                <TextInput
                  placeholder="Subject"
                  placeholderTextColor="#9CA3AF"
                  style={tw`bg-gray-800 text-gray-300 p-2 rounded border border-gray-700 mb-2`}
                  value={formData.subject}
                  onChangeText={(text) => setFormData({ ...formData, subject: text })}
                />

                {/* Session Type Dropdown */}
                <View style={tw`bg-gray-800 border border-gray-700 rounded mb-2`}>
                  <Picker
                    selectedValue={formData.sessionType}
                    onValueChange={(type) => {
                      const cost = String(formData.pricing?.[type] || 0)
                      setFormData({ ...formData, sessionType: type, sessionCost: cost })
                    }}
                  >
                    <Picker.Item label="Select session type…" value="" />
                    {Object.keys(formData.pricing || {}).map((type) => (
                      <Picker.Item
                        key={type}
                        label={type.replace(/([A-Z])/g, ' $1')}
                        value={type}
                      />
                    ))}
                  </Picker>
                </View>

                {/* Date Picker Trigger */}
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={tw`bg-gray-800 border border-gray-700 rounded p-2 mb-2`}
                >
                  <Text style={tw`text-gray-300`}>
                    {formData.date || 'Select date'}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={formData.date ? new Date(formData.date) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(_, selected) => {
                      setShowDatePicker(false)
                      if (selected) {
                        const iso = selected.toISOString().split('T')[0]
                        setFormData({ ...formData, date: iso })
                      }
                    }}
                  />
                )}

                {/* Create Session */}
                <TouchableOpacity
                  onPress={handleSessionCreation}
                  style={tw`bg-blue-500 py-2 rounded-lg mt-4`}
                >
                  <Text style={tw`text-white text-center font-bold`}>
                    Create Session
                  </Text>
                </TouchableOpacity>
              </View>
            )}
                <View style={tw`mb-4`}>
                  <Text style={tw`text-xl font-semibold text-blue-400 text-center mb-4`}>
                    Your Sessions
                  </Text>
                  {sessionData.length > 0 ? (
                    sessionData.map((session) => (
                      <View
                        key={session.id}
                        style={tw`bg-gray-800 p-4 rounded-lg shadow-md mb-4`}
                      >
                        <Text style={tw`text-gray-300`}>
                          Tutor Name: {session.tutor_name || 'N/A'}
                        </Text>
                        <Text style={tw`text-gray-300`}>
                          Session Type: {session.sessionType || 'N/A'}
                        </Text>
                        <Text style={tw`text-gray-300`}>
                          Session Cost: Ksh {session.amount || 'N/A'}
                        </Text>
                        <Text style={tw`text-gray-300`}>
                          Date: {new Date(session.date).toLocaleDateString() || 'N/A'}
                        </Text>
                        <Text style={tw`text-gray-300`}>
                          Status:{' '}
                          {session.status
                            ? session.status.charAt(0).toUpperCase() + session.status.slice(1)
                            : 'N/A'}
                        </Text>
                        {session.status === 'accepted' &&
                          session.zoom_links &&
                          session.zoom_links.length > 0 && (
                            <View style={tw`mt-2`}>
                              <Text style={tw`text-green-500 font-semibold mb-1`}>
                                Zoom Links Created:
                              </Text>
                              {session.zoom_links.map((link, idx) => (
                                <TouchableOpacity
                                  key={link}
                                  onPress={() => Linking.openURL(link)}
                                >
                                  <Text style={tw`text-blue-400 underline`}>
                                    Join Meeting Part {idx + 1}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                        {session.status === 'accepted' && (
                          <View style={tw`mt-2`}>
                            <TextInput
                              placeholder="Reason for cancellation"
                              placeholderTextColor="#9CA3AF"
                              style={tw`bg-gray-700 text-gray-300 p-3 rounded-lg border border-gray-600 mb-2`}
                              multiline
                              value={cancelReasons[session.id] || ''}
                              onChangeText={(text) =>
                                handleCancelReasonChange(session.id, text)
                              }
                            />
                            <TouchableOpacity
                              onPress={() =>
                                confirmCancelSession(session.id, role, session.status)
                              }
                              style={tw`bg-red-500 py-2 rounded-lg`}
                            >
                              <Text style={tw`text-white text-center font-bold`}>
                                Cancel Session
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {session.status === 'completed_pending' && (
                          <View style={tw`mt-4`}>
                            <Text style={tw`text-gray-400 text-center mb-2`}>
                              The tutor has marked this session as complete. Please confirm the
                              completion within 24 hours.
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleConfirmComplete(session.id)}
                              style={tw`bg-green-500 py-2 rounded-lg`}
                            >
                              <Text style={tw`text-white text-center font-bold`}>
                                Confirm Completion
                              </Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {session.status === 'completed' && (
                          <Text style={tw`text-green-500 text-center font-semibold`}>
                            Session Completed
                          </Text>
                        )}
                        {session.status === 'cancelled' && (
                          <Text style={tw`text-red-500 text-center`}>
                            Session Cancelled
                          </Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={tw`text-gray-500 text-center`}>No sessions yet.</Text>
                  )}
                </View>
              </>
            )}

            {role === 'tutor' && (
              <View style={tw`mb-4`}>
                <Text style={tw`text-xl font-semibold text-blue-400 text-center mb-4`}>
                  Your Upcoming Sessions
                </Text>
                {sessionData.length > 0 ? (
                  sessionData.map((session) => (
                    <View
                      key={session.id}
                      style={tw`bg-gray-800 p-4 rounded-lg shadow-md mb-4`}
                    >
                      <View style={tw`mb-2`}>
                        <Text style={tw`text-gray-300`}>
                          Student Name: {session.student_name || 'N/A'}
                        </Text>
                        <Text style={tw`text-gray-300`}>
                          Student ID: {session.student_id || 'N/A'}
                        </Text>
                      </View>
                      <View style={tw`mb-2`}>
                        <Text style={tw`text-gray-300`}>
                          Session Type: {session.sessionType || 'N/A'}
                        </Text>
                        <Text style={tw`text-gray-300`}>
                          Session Cost: ${session.amount || 'N/A'}
                        </Text>
                        <Text style={tw`text-gray-300`}>
                          Subject: {session.subject || 'N/A'}
                        </Text>
                        <Text style={tw`text-gray-300`}>
                          Date: {new Date(session.date).toLocaleDateString() || 'N/A'}
                        </Text>
                      </View>
                      {session.status === 'upcoming' ? (
                        <View style={tw`mt-2`}>
                          <TouchableOpacity
                            onPress={() => handleAcceptSession(session.id)}
                            style={tw`bg-green-500 py-2 rounded-lg mb-2`}
                          >
                            <Text style={tw`text-white text-center font-bold`}>
                              Accept Session
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              handleCancelSession(session.id, role, session.status)
                            }
                            style={tw`bg-red-500 py-2 rounded-lg mb-2`}
                          >
                            <Text style={tw`text-white text-center font-bold`}>
                              Cancel Session
                            </Text>
                          </TouchableOpacity>
                          <TextInput
                            placeholder="Reason for cancellation (if applicable)"
                            placeholderTextColor="#9CA3AF"
                            style={tw`bg-gray-700 text-gray-300 p-3 rounded-lg border border-gray-600 mb-2`}
                            multiline
                            value={cancelReasons[session.id] || ''}
                            onChangeText={(text) =>
                              handleCancelReasonChange(session.id, text)
                            }
                          />
                        </View>
                      ) : session.status === 'accepted' ? (
                        <View style={tw`mt-2`}>
                          <TouchableOpacity
                            onPress={() =>
                              navigation.navigate('Messages', { studentId: session.student_id })
                            }
                            style={tw`bg-blue-500 py-2 rounded-lg mb-2`}
                          >
                            <Text style={tw`text-white text-center font-bold`}>
                              Chat with Student
                            </Text>
                          </TouchableOpacity>
                          {!session.zoom_links || session.zoom_links.length === 0 ? (
                            <TouchableOpacity
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
                              style={tw`bg-yellow-500 py-2 rounded-lg mb-2`}
                            >
                              <Text style={tw`text-white text-center font-bold`}>
                                Create Zoom Links
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View style={tw`mt-2`}>
                              <Text style={tw`text-green-500 font-semibold mb-1`}>
                                Zoom Links Created:
                              </Text>
                              {session.zoom_links.map((link, idx) => (
                                <TouchableOpacity
                                  key={link}
                                  onPress={() => Linking.openURL(link)}
                                >
                                  <Text style={tw`text-blue-400 underline`}>
                                    Join Meeting Part {idx + 1}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          )}
                          <TouchableOpacity
                            onPress={() => handleCompletePending(session.id)}
                            style={tw`bg-purple-500 py-2 rounded-lg mt-2`}
                          >
                            <Text style={tw`text-white text-center font-bold`}>
                              Mark as Complete-Pending
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ) : session.status === 'completed_pending' ? (
                        <Text style={tw`text-purple-500 text-center font-semibold mt-2`}>
                          Complete-Pending
                        </Text>
                      ) : session.status === 'completed' ? (
                        <Text style={tw`text-green-500 text-center font-semibold mt-2`}>
                          Session Completed
                        </Text>
                      ) : (
                        <Text style={tw`text-red-500 text-center mt-2`}>
                          Session Cancelled
                        </Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={tw`text-gray-500 text-center`}>
                    No upcoming sessions found.
                  </Text>
                )}
              </View>
            )}
          </>
        )}

        {activeTab === 'reviews' && (
          <View style={tw`bg-gray-800 p-6 rounded-lg shadow-md mb-4`}>  
            <Text style={tw`text-xl font-semibold text-blue-400 mb-4 text-center`}>
              Post a Review
            </Text>
            <TextInput
              placeholder="Tutor ID"
              placeholderTextColor="#9CA3AF"
              style={tw`bg-gray-900 text-gray-300 p-3 rounded mb-2`}
              onChangeText={(text) => setFormData({ ...formData, tutorId: text })}
            />
            <TextInput
              placeholder="Comment"
              placeholderTextColor="#9CA3AF"
              style={tw`bg-gray-900 text-gray-300 p-3 rounded mb-2`}
              multiline
              onChangeText={(text) => setFormData({ ...formData, comment: text })}
            />
            <TextInput
              placeholder="Rating (1-5)"
              placeholderTextColor="#9CA3AF"
              style={tw`bg-gray-900 text-gray-300 p-3 rounded mb-2`}
              keyboardType="numeric"
              onChangeText={(text) => setFormData({ ...formData, rating: text })}
            />
            <TouchableOpacity
              onPress={() => debouncedReviewSubmission()}
              style={tw`bg-blue-500 py-2 rounded-lg`}
            >
              <Text style={tw`text-white text-center font-bold`}>Submit Review</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'earnings' && (
          <View>
            <Text style={tw`text-xl font-semibold text-blue-400 text-center mb-4`}>
              Your Earnings
            </Text>
            {earningData.length > 0 ? (
              earningData.map((earning) => (
                <View
                  key={earning.id}
                  style={tw`bg-gray-800 p-4 rounded-lg shadow-md mb-4`}
                >
                  <Text style={tw`text-gray-300`}>Amount: ${earning.amount}</Text>
                  <Text style={tw`text-gray-300`}>
                    Description: {earning.description}
                  </Text>
                  <Text style={tw`text-gray-300`}>
                    Date: {new Date(earning.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={tw`text-gray-500 text-center`}>No earnings found.</Text>
            )}
          </View>
        )}
      </View>

      {showRatingModal && (
        <View style={tw`absolute inset-0 bg-black bg-opacity-50 justify-center items-center z-50`}>
          <View style={tw`bg-gray-800 p-6 rounded w-11/12 max-w-md`}>
            <Text style={tw`text-xl font-bold text-white mb-4 text-center`}>
              Rate Your Tutor
            </Text>
            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-300 mb-1`}>Rating (1-5):</Text>
              <TextInput
                keyboardType="numeric"
                value={ratingData.rating?.toString()}
                onChangeText={(text) => setRatingData({ ...ratingData, rating: text })}
                style={tw`bg-gray-700 text-white p-2 rounded w-full`}
              />
            </View>
            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-300 mb-1`}>Comment:</Text>
              <TextInput
                multiline
                value={ratingData.comment}
                onChangeText={(text) => setRatingData({ ...ratingData, comment: text })}
                style={tw`bg-gray-700 text-white p-2 rounded w-full`}
              />
            </View>
            <View style={tw`flex-row justify-end`}>
              <TouchableOpacity
                onPress={() => setShowRatingModal(false)}
                style={tw`bg-gray-500 px-4 py-2 rounded mr-2`}
              >
                <Text style={tw`text-white`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleReviewSubmission()}
                style={tw`bg-pink-500 px-4 py-2 rounded`}
              >
                <Text style={tw`text-white`}>Submit Rating</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default AccountSectionNative;
