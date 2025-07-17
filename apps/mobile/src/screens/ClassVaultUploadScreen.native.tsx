 /// <reference path="../declarations.d.ts" />

import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  View,
  Text,
  Image,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
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
import type {
  SessionType,
  EarningType,
  Transactions,
  User,
} from '@mytutorapp/shared/types'
import tw from '../../tailwind'
import { Picker } from '@react-native-picker/picker'
import DateTimePicker, { Event } from '@react-native-community/datetimepicker'
import type { MainStackParamList } from '../navigation/types'
import { useShopContext } from '@mytutorapp/shared/context'

// -- Tab keys --
type TabType = 'overview' | 'transactions' | 'sessions' | 'reviews' | 'earnings'

// -- Type guards --
const isSessionType = (x: unknown): x is SessionType =>
  typeof x === 'object' &&
  x !== null &&
  typeof (x as SessionType).sessionType === 'string' &&
  (typeof (x as SessionType).amount === 'number' ||
   typeof (x as SessionType).amount === 'string') &&
  typeof (x as SessionType).date === 'string'

const isEarningType = (x: unknown): x is EarningType =>
  typeof x === 'object' &&
  x !== null &&
  typeof (x as EarningType).amount === 'number' &&
  typeof (x as EarningType).description === 'string' &&
  typeof (x as EarningType).createdAt === 'string'

// -- Parse query-string params --
function parseAccountPath(path: string): MainStackParamList['Account'] {
  const [, q = ''] = path.split('?')
  const p = new URLSearchParams(q)
  const pricingString = p.get('pricing')
  const pricing = pricingString ? JSON.parse(pricingString) : undefined

  return {
    action:    (p.get('action') as 'createSession') || undefined,
    tutorId:   p.get('tutorId')   || undefined,
    tutorName: p.get('tutorName') || undefined,
    subject:   p.get('subject')   || undefined,
    pricing,
  }
}

const SESSION_TYPES = [
  { key: 'privateSession', label: 'Private (60m)' },
  { key: 'groupSession',   label: 'Group (90m)'   },
  { key: 'workshop',       label: 'Workshop (120m)' },
  { key: 'lecture',        label: 'Lecture (180m)' },
] as const
type SessionKey = typeof SESSION_TYPES[number]['key']

const AccountSectionNative: React.FC = () => {
  const { backendUrl } = useShopContext()
  const navigation    = useNavigation<NavigationProp<MainStackParamList>>()
  const route         = useRoute<RouteProp<MainStackParamList, 'Account'>>()

  // ⬇️ rename here:
  const sessionsScrollRef = useRef<ScrollView>(null)

  const [showDatePicker, setShowDatePicker] = useState(false)

  // Build hook queryParams
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
  const confirmFn = (msg: string): Promise<boolean> =>
    new Promise(res => Alert.alert('Confirm', msg, [
      { text: 'Cancel', onPress: () => res(false), style: 'cancel' },
      { text: 'OK',     onPress: () => res(true)  },
    ]))

  const navigateFn = (dest: string) => {
    if (dest.startsWith('/account')) {
      navigation.navigate('Account', parseAccountPath(dest))
    } else if (dest === '/buy-tokens') {
      navigation.navigate('BuyTokens')
    }
  }

  type HookResult = ReturnType<typeof useAccountSection> & {
    user: User | null
    activeTab: TabType
    setActiveTab: (tab: TabType) => void
    cancelReasons: Record<string, string>
    ratingData: { rating: string; comment: string }
  }

  const hookResult = useAccountSection({
    alertFn,
    confirmFn,
    navigateFn,
    queryParams,
  }) as HookResult

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
  } = hookResult

  // Flip to sessions tab once when arriving via createSession
  useEffect(() => {
    if (route.params?.action === 'createSession' && activeTab !== 'sessions') {
      setActiveTab('sessions')
    }
  }, [route.params?.action, activeTab, setActiveTab])

  // Wrap create so we scroll and switch tab
  const onCreateSession = async () => {
    await handleSessionCreation()
    setActiveTab('sessions')
    setTimeout(() => {
      sessionsScrollRef.current?.scrollToEnd({ animated: true })
    }, 50)
  }

  const debouncedReview = useMemo(
    () => debounce(handleReviewSubmission, 300),
    [handleReviewSubmission]
  )
  useEffect(() => () => debouncedReview.cancel(), [debouncedReview])

  const sessionData = Array.isArray(accountDetails.session)
    ? (accountDetails.session as unknown[]).filter(isSessionType)
    : []
  const earningData = Array.isArray(accountDetails.earning)
    ? (accountDetails.earning as unknown[]).filter(isEarningType)
    : []

  const tabs = useMemo(() => {
    const t: TabType[] = ['overview', 'transactions']
    if (role === 'student') t.push('sessions', 'reviews')
    if (role === 'tutor')   t.push('sessions', 'earnings')
    return t
  }, [role])

  const labels: Record<TabType, string> = {
    overview:     'Overview',
    transactions: 'Transactions',
    sessions:     'Sessions',
    reviews:      'Reviews',
    earnings:     'Earnings',
  }

  const raw = user?.profileImage ?? ''
const profileImageUri = raw.startsWith('http')
  ? raw
  : `${backendUrl}${raw}`


  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Spinner />
      </View>
    )
  }

  const dateValue = formData.date
    ? new Date(String(formData.date))
    : new Date()


  return (
    <View style={tw`flex-1 bg-gray-900 p-4 pb-16`}>

      {/* HEADER */}
      <View style={tw`bg-gray-800 p-6 rounded-lg shadow-lg flex-row items-center mb-4`}>
        {role !== 'student' && (
          <Image
          source={{ uri: profileImageUri }}
          style={tw`w-20 h-20 rounded-full mr-4`}
        />
        )}
        <View style={tw`flex-1`}>
          <Text style={tw`text-2xl font-bold text-blue-400`}>
            {user?.name ?? 'User Name'}
          </Text>
          <Text style={tw`text-gray-400`}>{user?.email}</Text>
          {role === 'student' && (
            <Text style={tw`text-gray-300`}>Tokens: {user.tokens}</Text>
          )}
        </View>
      </View>

      {/* TABS */}
      <View style={tw`flex-row bg-gray-800 rounded-lg mb-8 overflow-hidden`}>
        {tabs.map(tabKey => (
          <TouchableOpacity
            key={tabKey}
            onPress={() => setActiveTab(tabKey)}
            style={tw.style(
              'flex-1 py-3 items-center justify-center',
              activeTab === tabKey ? 'bg-gray-700' : 'bg-gray-800'
            )}
          >
            <Text style={tw.style(
              'text-sm',
              activeTab === tabKey 
                ? 'text-white font-semibold' 
                : 'text-gray-400'
            )}>
              {labels[tabKey]}
            </Text>
            {activeTab === tabKey && (
              <View style={tw`absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-pink-500`} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* CONTENT */}
      <View>
<View style={tw`mt-4`}></View>
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <Text style={tw`text-gray-400 text-lg text-center`}>
            Welcome to your account overview.
          </Text>
        )}

        {/* TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <View>
            <Text style={tw`text-xl font-semibold text-blue-400 text-center mb-2`}>
              Transaction History
            </Text>
            {transactions.length > 0 ? (
              transactions.map((tx: Transactions) => (
                <View
                  key={tx.id}
                  style={tw`bg-gray-800 p-4 rounded-lg shadow-md mb-4`}
                >
                  <Text style={tw`text-gray-300`}>Type: {tx.type}</Text>
                  <Text style={tw`text-gray-300`}>
                    Amount: ${Math.abs(tx.amount)}
                  </Text>
                  <Text style={tw`text-gray-300`}>
                    {tx.amount > 0 ? 'Earning' : 'Deduction'}
                  </Text>
                  <Text style={tw`text-gray-300`}>
                    Description: {tx.description || 'N/A'}
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

        {/* SESSIONS */}
        {activeTab === 'sessions' && (
          <>
            {/* STUDENT: CREATE SESSION */}
            {role === 'student' && (
              <View style={tw`bg-gray-800 p-6 rounded-lg shadow-md mb-4`}>
                <View style={tw`bg-yellow-100 border-l-4 border-yellow-500 p-2 rounded mb-4`}>
                  <Text style={tw`text-yellow-700 text-sm`}>
                    To create a session, go Home, select a tutor, then tap "Create Session".
                  </Text>
                </View>
                <Text style={tw`text-lg font-semibold mb-4 text-blue-400 text-center`}>
                  {formData.tutorName
                    ? `Session with Tutor ${formData.tutorName}`
                    : 'Create a Session'}
                </Text>
                <TextInput
                  placeholder="Subject"
                  placeholderTextColor="#9CA3AF"
                  style={tw`bg-gray-800 text-gray-300 p-2 rounded border border-gray-700 mb-2`}
                  value={formData.subject}
                  onChangeText={(t: string) => setFormData({ ...formData, subject: t })}
                />
                  <View style={tw`mb-2`}>
  <View style={tw`bg-gray-800 border border-gray-700 rounded`}>
    {/* force the generic to `string` so selectedValue/onValueChange expect plain strings */}
    <Picker<string>
      selectedValue={formData.sessionType ?? ''}  
      onValueChange={(type) => {
        // if they tapped the placeholder, do nothing
        if (!type) return;

        // cast pricing to a string-indexable Record to satisfy TS
        const cost = String(
          (formData.pricing as Record<string, number | string>)[type] || 0
        );

        setFormData({
          ...formData,
          sessionType: type,
          sessionCost: cost,
        });
      }}
      mode="dropdown"
      style={tw`text-gray-300 bg-gray-800 px-3 py-2`}
      dropdownIconColor="#9CA3AF"                // plain hex, TS-friendly
      itemStyle={tw`text-gray-400 bg-gray-700 px-4 py-2`}
    >
      {/* placeholder must use a string (""), not undefined, so it matches T=string */}
      <Picker.Item label="Select session type…" value="" />

      {SESSION_TYPES.map(({ key, label }) => (
        <Picker.Item key={key} label={label} value={key} />
      ))}
    </Picker>
  </View>
</View>

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
                    value={dateValue}
                    mode="date"
                    display="default"
                    onChange={(_e: Event, d?: Date) => {
                      setShowDatePicker(false)
                      if (d) {
                        setFormData({ ...formData, date: d.toISOString().slice(0, 10) })
                      }
                    }}
                  />
                )}
                <TouchableOpacity
                  onPress={onCreateSession}
                  style={tw`bg-blue-500 py-2 rounded-lg mt-4`}
                >
                  <Text style={tw`text-white text-center font-bold`}>Create Session</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SESSIONS LIST */}
           <ScrollView
            ref={sessionsScrollRef}                // ← and here!
            style={tw`mb-4`}
            contentContainerStyle={tw`px-0 pb-4`}
          >
              <Text style={tw`text-xl font-semibold text-blue-400 text-center mb-4`}>
                {role === 'student' ? 'Your Sessions' : 'Your Upcoming Sessions'}
              </Text>
              {sessionData.length > 0 ? (
                sessionData.map((sess: SessionType) => (
                  <View
                    key={sess.id}
                    style={tw`bg-gray-800 p-4 rounded-lg shadow-md mb-4`}
                  >
                    {role === 'student' ? (
                      <>
                        <Text style={tw`text-gray-300`}>Tutor: {sess.tutor_name}</Text>
                        <Text style={tw`text-gray-300`}>Type: {sess.sessionType}</Text>
                        <Text style={tw`text-gray-300`}>Cost: Ksh {sess.amount}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={tw`text-gray-300`}>Student: {sess.student_name}</Text>
                        <Text style={tw`text-gray-300`}>ID: {sess.student_id}</Text>
                      </>
                    )}
                    <Text style={tw`text-gray-300`}>Subject: {sess.subject}</Text>
                    <Text style={tw`text-gray-300`}>Date: {new Date(sess.date).toLocaleDateString()}</Text>
                    <Text style={tw`text-gray-300`}>
                      Status: {sess.status.charAt(0).toUpperCase() + sess.status.slice(1)}
                    </Text>

                    {/* accepted + zoom links */}
                    {sess.status === 'accepted' &&
                      Array.isArray(sess.zoom_links) &&
                      sess.zoom_links.length > 0 && (
                        <View style={tw`mt-2`}>
                          <Text style={tw`text-green-500 font-semibold mb-1`}>Zoom Links:</Text>
                          {sess.zoom_links.map((link: string, idx: number) => (
                            <TouchableOpacity
                              key={link}
                              onPress={() => Linking.openURL(link)}
                            >
                              <Text style={tw`text-blue-400 underline`}>Part {idx + 1}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                    {/* STUDENT: Can cancel only if accepted */}
                    {role === 'student' && sess.status === 'accepted' && (
                      <View style={tw`mt-2`}>
                        <TextInput
                          placeholder="Reason for cancellation"
                          placeholderTextColor="#9CA3AF"
                          multiline
                          style={tw`bg-gray-700 text-gray-300 p-3 rounded-lg border border-gray-600 mb-2`}
                          value={cancelReasons[sess.id] ?? ''}
                          onChangeText={(reason: string) =>
                            handleCancelReasonChange(sess.id, reason)
                          }
                        />
                        <TouchableOpacity
                          onPress={() => confirmCancelSession(sess.id, role, sess.status)}
                          style={tw`bg-red-500 py-2 rounded-lg`}
                        >
                          <Text style={tw`text-white text-center font-bold`}>
                            Cancel Session
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* completed_pending */}
                    {sess.status === 'completed_pending' && (
                      <View style={tw`mt-4`}>
                        {role === 'student' ? (
                          <>
                            <Text style={tw`text-gray-400 text-center mb-2`}>
                              Your tutor has marked this session as complete. Please confirm.
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleConfirmComplete(sess.id)}
                              style={tw`bg-green-500 py-2 rounded-lg`}
                            >
                              <Text style={tw`text-white text-center font-bold`}>
                                Confirm Completion
                              </Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <Text style={tw`text-purple-500 text-center font-semibold`}>
                            Waiting for student to confirm completion
                          </Text>
                        )}
                      </View>
                    )}

                    {/* completed */}
                    {sess.status === 'completed' && (
                      <Text style={tw`text-green-500 text-center font-semibold`}>
                        {role === 'student'
                          ? 'Session Completed. Thank you!'
                          : 'Session Completed'}
                      </Text>
                    )}

                    {/* cancelled */}
                    {sess.status === 'cancelled' && (
                      <Text style={tw`text-red-500 text-center`}>Session Cancelled</Text>
                    )}

                    {/* TUTOR: Accept / Cancel for upcoming */}
                    {role === 'tutor' && sess.status === 'upcoming' && (
                      <View style={tw`mt-2`}>
                        <TouchableOpacity
                          onPress={() => handleAcceptSession(sess.id)}
                          style={tw`bg-green-500 py-2 rounded-lg mb-2`}
                        >
                          <Text style={tw`text-white text-center font-bold`}>Accept Session</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleCancelSession(sess.id, role, sess.status)}
                          style={tw`bg-red-500 py-2 rounded-lg mb-2`}
                        >
                          <Text style={tw`text-white text-center font-bold`}>Cancel Session</Text>
                        </TouchableOpacity>
                        <TextInput
                          placeholder="Cancel reason"
                          placeholderTextColor="#9CA3AF"
                          multiline
                          style={tw`bg-gray-700 text-gray-300 p-3 rounded-lg border border-gray-600 mb-2`}
                          value={cancelReasons[sess.id] ?? ''}
                          onChangeText={(reason: string) =>
                            handleCancelReasonChange(sess.id, reason)
                          }
                        />
                      </View>
                    )}

                    {/* TUTOR: accepted actions */}
                    {role === 'tutor' && sess.status === 'accepted' && (
                      <View style={tw`mt-2`}>
                        {!sess.zoom_links?.length && (
                          <TouchableOpacity
                            onPress={() => {
                              const durations: Record<string, number> = {
                                privateSession: 60,
                                groupSession: 90,
                                lecture: 120,
                                workshop: 180,
                              }
                              const duration =
                                typeof sess.total_duration === 'number'
                                  ? sess.total_duration
                                  : durations[sess.sessionType] || 40
                              handleCreateZoomLink(
                                sess.id,
                                sess.subject || 'General',
                                sess.date,
                                duration,
                                sess.tutor_name || 'Tutor'
                              )
                            }}
                            style={tw`bg-yellow-500 py-2 rounded-lg mb-2`}
                          >
                            <Text style={tw`text-white text-center font-bold`}>
                              Create Zoom Links
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => handleCompletePending(sess.id)}
                          style={tw`bg-purple-500 py-2 rounded-lg mb-2`}
                        >
                          <Text style={tw`text-white text-center font-bold`}>
                            Mark as Complete-Pending
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() =>
                            navigation.navigate('Messages', {
                              studentId: String(sess.student_id),
                            })
                          }
                          style={tw`bg-blue-500 py-2 rounded-lg`}
                        >
                          <Text style={tw`text-white text-center font-bold`}>
                            Chat with Student
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text style={tw`text-gray-500 text-center`}>
                  {role === 'student' ? 'No sessions yet.' : 'No upcoming sessions.'}
                </Text>
              )}
            </ScrollView>
          </>
        )}

        {/* REVIEWS */}
        {activeTab === 'reviews' && (
          <View style={tw`bg-gray-800 p-6 rounded-lg shadow-md mb-4`}>
            <Text style={tw`text-xl font-semibold text-blue-400 mb-4 text-center`}>
              Post a Review
            </Text>
            <TextInput
              placeholder="Tutor ID"
              placeholderTextColor="#9CA3AF"
              style={tw`bg-gray-900 text-gray-300 p-3 rounded mb-2`}
              onChangeText={(t: string) => setFormData({ ...formData, tutorId: t })}
            />
            <TextInput
              placeholder="Comment"
              placeholderTextColor="#9CA3AF"
              style={tw`bg-gray-900 text-gray-300 p-3 rounded mb-2`}
              multiline
              onChangeText={(t: string) => setFormData({ ...formData, comment: t })}
            />
            <TextInput
              placeholder="Rating (1-5)"
              placeholderTextColor="#9CA3AF"
              style={tw`bg-gray-900 text-gray-300 p-3 rounded mb-2`}
              keyboardType="numeric"
              value={ratingData.rating}
              onChangeText={(t: string) => setRatingData({ ...ratingData, rating: t })}
            />
            <TouchableOpacity
              onPress={() => debouncedReview()}
              style={tw`bg-blue-500 py-2 rounded-lg`}
            >
              <Text style={tw`text-white text-center font-bold`}>Submit Review</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* EARNINGS */}
        {activeTab === 'earnings' && (
          <View>
            <Text style={tw`text-xl font-semibold text-blue-400 text-center mb-4`}>
              Your Earnings
            </Text>
            {earningData.length > 0 ? (
              earningData.map((e: EarningType) => (
                <View
                  key={e.id}
                  style={tw`bg-gray-800 p-4 rounded-lg shadow-md mb-4`}
                >
                  <Text style={tw`text-gray-300`}>Amount: ${e.amount}</Text>
                  <Text style={tw`text-gray-300`}>Description: {e.description}</Text>
                  <Text style={tw`text-gray-300`}>Date: {new Date(e.createdAt).toLocaleDateString()}</Text>
                </View>
              ))
            ) : (
              <Text style={tw`text-gray-500 text-center`}>No earnings found.</Text>
            )}
          </View>
        )}
      </View>

   <Modal
  visible={showRatingModal}
  transparent
  animationType="fade"
  onRequestClose={() => setShowRatingModal(false)}
>
  <View style={tw`absolute inset-0 bg-black bg-opacity-50 justify-center items-center`}>
    <View style={tw`bg-gray-800 p-6 rounded w-11/12 max-w-md`}>
      <Text style={tw`text-xl font-bold text-white mb-4 text-center`}>
        Rate Your Tutor
      </Text>

      {/* RATING DROPDOWN */}
      <View style={tw`mb-4`}>
        <Text style={tw`text-gray-300 mb-1`}>Rating (1–5):</Text>
        <View style={tw`bg-gray-700 rounded overflow-hidden`}>
          <Picker
            selectedValue={ratingData.rating}
            onValueChange={(value: string) =>
              setRatingData({ ...ratingData, rating: value })
            }
            mode="dropdown"
            style={{ width: '100%', color: 'white' }}
            dropdownIconColor="white"
          >
            <Picker.Item label="Select rating…" value="" />
            <Picker.Item label="1" value="1" />
            <Picker.Item label="2" value="2" />
            <Picker.Item label="3" value="3" />
            <Picker.Item label="4" value="4" />
            <Picker.Item label="5" value="5" />
          </Picker>
        </View>
      </View>

      {/* COMMENT BOX */}
      <View style={tw`mb-4`}>
        <Text style={tw`text-gray-300 mb-1`}>Comment:</Text>
        <TextInput
          multiline
          value={ratingData.comment}
          onChangeText={(t: string) =>
            setRatingData({ ...ratingData, comment: t })
          }
          placeholder="Leave a comment (optional)…"
          placeholderTextColor="#9CA3AF"
          style={tw`bg-gray-700 text-white p-2 rounded h-20`}
        />
      </View>

      {/* ACTION BUTTONS */}
      <View style={tw`flex-row justify-end`}>
        <TouchableOpacity
          onPress={() => setShowRatingModal(false)}
          style={tw`bg-gray-500 px-4 py-2 rounded mr-2`}
        >
          <Text style={tw`text-white`}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleReviewSubmission}
          style={tw`bg-pink-500 px-4 py-2 rounded`}
        >
          <Text style={tw`text-white`}>Submit Rating</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

    </View>
  )
}

export default AccountSectionNative
