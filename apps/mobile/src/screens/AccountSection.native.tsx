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

const AccountSectionNative: React.FC = () => {
  const { backendUrl, refreshUserDetails } = useShopContext()
  const navigation    = useNavigation<NavigationProp<MainStackParamList>>()
  const route         = useRoute<RouteProp<MainStackParamList, 'Account'>>()
  const isCreateMode  = route.params?.action === 'createSession'

  // ─── Refs & state
  const sessionsScrollRef = useRef<ScrollView>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)

  // ─── Build hook queryParams
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

  // ─── Hook
  const {
    loading,
    user,
    transactions,
    sessions,
    earnings,
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
  } = useAccountSection({ alertFn, confirmFn, navigateFn, queryParams })

  const role = user?.role

  // ─── Debounce review
  const debouncedReview = useMemo(
    () => debounce(handleReviewSubmission, 300),
    [handleReviewSubmission]
  )
  useEffect(() => () => debouncedReview.cancel(), [debouncedReview])

  // ─── On mount from createSession
  useEffect(() => {
    if (isCreateMode && activeTab !== 'sessions') {
      setActiveTab('sessions')
    }
  }, [isCreateMode, activeTab, setActiveTab])

  // ─── onCreate wrapper
  const onCreateSession = async () => {
    await handleSessionCreation()
    await refreshUserDetails()
    setActiveTab('sessions')
    navigation.setParams({ action: undefined })
    setTimeout(() => {
      sessionsScrollRef.current?.scrollToEnd({ animated: true })
    }, 50)
  }

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center`}>
        <Spinner />
      </View>
    )
  }

  // ─── Date pick defaults
  const dateValue = formData.date
    ? new Date(String(formData.date))
    : new Date()

  // ─── Tabs config
  const tabs: TabType[] = useMemo(() => {
    const t: TabType[] = ['overview','transactions']
    if (role === 'student') t.push('sessions','reviews')
    if (role === 'tutor')   t.push('sessions','earnings')
    return t
  }, [role])
  const labels: Record<TabType,string> = {
    overview:     'Overview',
    transactions: 'Transactions',
    sessions:     'Sessions',
    reviews:      'Reviews',
    earnings:     'Earnings',
  }

  // ─── Render
  return (
    <View style={tw`flex-1 bg-gray-900 p-4 pb-16`}>
      {/* HEADER */}
      <View style={tw`bg-gray-800 p-6 rounded-lg flex-row items-center mb-4`}>
        {role !== 'student' && (
          <Image
            source={{
              uri: user?.profileImage
                ? `${backendUrl}${user.profileImage}`
                : '/default-avatar.jpg'
            }}
            style={tw`w-20 h-20 rounded-full mr-4`}
          />
        )}
        <View style={tw`flex-1`}>
          <Text style={tw`text-2xl font-bold text-blue-400`}>{user?.name}</Text>
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
              'flex-1 py-3 items-center',
              activeTab === tabKey ? 'bg-gray-700' : 'bg-gray-800'
            )}
          >
            <Text style={tw.style(
              'text-sm',
              activeTab === tabKey ? 'text-white font-semibold' : 'text-gray-400'
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
      <ScrollView ref={sessionsScrollRef}>
        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <Text style={tw`text-gray-400 text-lg text-center`}>
            Welcome to your account overview.
          </Text>
        )}

        {/* TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <View>
            <Text style={tw`text-xl font-semibold text-blue-400 mb-4 text-center`}>
              Transaction History
            </Text>
            {transactions.map((tx: Transactions) => (
              <View key={tx.id} style={tw`bg-gray-800 p-4 rounded-lg mb-4`}>
                <Text style={tw`text-gray-300`}>Type: {tx.type}</Text>
                <Text style={tw`text-gray-300`}>Amount: ${Math.abs(tx.amount)}</Text>
                <Text style={tw`text-gray-300`}>
                  {tx.amount > 0 ? 'Earning' : 'Deduction'}
                </Text>
                <Text style={tw`text-gray-300`}>Description: {tx.description || 'N/A'}</Text>
                <Text style={tw`text-gray-300`}>
                  Date:{' '}
                  {tx.date
                    ? new Date(tx.date).toLocaleDateString()
                    : new Date().toLocaleDateString()
                  }
                </Text>
                <Text style={tw`text-gray-300`}>Status: {tx.status || 'N/A'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* SESSIONS */}
        {activeTab === 'sessions' && (
          <>
            {/* CREATE SESSION FORM */}
            {role === 'student' && isCreateMode && (
              <View style={tw`bg-gray-800 p-6 rounded-lg mb-4`}>
                <View style={tw`bg-yellow-100 border-l-4 border-yellow-500 p-2 rounded mb-4`}>
                  <Text style={tw`text-yellow-700 text-sm`}>
                    To create a session, pick your subject and date below.
                  </Text>
                </View>
                {/* Subject, Type pickers… */}
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  style={tw`bg-gray-800 border border-gray-700 p-2 rounded mb-2`}
                >
                  <Text style={tw`text-gray-300`}>
                    {formData.date || 'Select date'}
                  </Text>
                </TouchableOpacity>
                {isCreateMode && showDatePicker && (
                  <DateTimePicker
                    value={dateValue}
                    mode="date"
                    display="default"
                    onChange={(_e: Event, d?: Date) => {
                      setShowDatePicker(false)
                      if (d) {
                        setFormData({ ...formData, date: d.toISOString().slice(0,10) })
                      }
                    }}
                  />
                )}
                <TouchableOpacity
                  onPress={onCreateSession}
                  style={tw`bg-blue-500 py-2 rounded-lg mt-4`}
                >
                  <Text style={tw`text-white text-center font-bold`}>
                    Create Session
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* SESSIONS LIST */}
            {sessions.map((sess: SessionType) => (
              <View key={sess.id} style={tw`bg-gray-800 p-4 rounded-lg mb-4`}>
                <Text style={tw`text-gray-300`}>Subject: {sess.subject}</Text>
                <Text style={tw`text-gray-300`}>
                  Date: {sess.date
                    ? new Date(sess.date).toLocaleDateString()
                    : new Date().toLocaleDateString()
                  }
                </Text>
                <Text style={tw`text-gray-300`}>Status: {sess.status}</Text>

                {/* ACCEPTED */}
                {sess.status === 'accepted' && (
                  <>
                    {Array.isArray(sess.zoom_links) && sess.zoom_links.length > 0 ? (
                      <View style={tw`mt-2`}>
                        <Text style={tw`text-green-500 font-semibold mb-1`}>Zoom Links:</Text>
                        {sess.zoom_links.map((link, i) => (
                          <TouchableOpacity key={i} onPress={() => Linking.openURL(link)}>
                            <Text style={tw`text-blue-400 underline`}>Part {i+1}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={tw`mt-2 bg-yellow-500 py-2 rounded-lg`}
                        onPress={() => {
                          const durations: Record<string,number> = {
                            privateSession: 60,
                            groupSession:   90,
                            lecture:       120,
                            workshop:      180,
                          }
                          const dur = typeof sess.total_duration === 'number'
                            ? sess.total_duration
                            : durations[sess.sessionType] || 60
                          handleCreateZoomLink(
                            sess.id,
                            sess.subject || 'General',
                            sess.date ?? new Date().toISOString(),
                            dur,
                            (role === 'tutor' ? sess.tutor_name : sess.student_name) || ''
                          )
                        }}
                      >
                        <Text style={tw`text-white text-center font-bold`}>
                          Create Zoom Links
                        </Text>
                      </TouchableOpacity>
                    )}

                    {role === 'student' && (
                      <>
                        <TextInput
                          placeholder="Reason for cancellation"
                          placeholderTextColor="#9CA3AF"
                          multiline
                          style={tw`bg-gray-700 text-gray-300 p-3 rounded-lg border border-gray-600 mt-2`}
                          value={cancelReasons[sess.id] ?? ''}
                          onChangeText={r => handleCancelReasonChange(sess.id, r)}
                        />
                        <TouchableOpacity
                          style={tw`mt-2 bg-red-500 py-2 rounded-lg`}
                          onPress={() => confirmCancelSession(sess.id, role!, sess.status)}
                        >
                          <Text style={tw`text-white text-center font-bold`}>
                            Cancel Session
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </>
                )}

                {/* COMPLETED PENDING */}
                {sess.status === 'completed_pending' && (
                  <View style={tw`mt-4`}>
                    {role === 'student' ? (
                      <>
                        <Text style={tw`text-gray-400 text-center mb-2`}>
                          Tutor marked complete—please confirm.
                        </Text>
                        <TouchableOpacity
                          style={tw`bg-green-500 py-2 rounded-lg`}
                          onPress={() => handleConfirmComplete(sess.id)}
                        >
                          <Text style={tw`text-white text-center font-bold`}>
                            Confirm Completion
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={tw`text-purple-500 text-center font-semibold`}>
                        Awaiting student’s confirmation
                      </Text>
                    )}
                  </View>
                )}

                {/* COMPLETED */}
                {sess.status === 'completed' && (
                  <Text style={tw`text-green-500 text-center font-semibold`}>
                    Session completed.
                  </Text>
                )}

                {/* CANCELLED */}
                {sess.status === 'cancelled' && (
                  <Text style={tw`text-red-500 text-center`}>
                    Session cancelled
                  </Text>
                )}

                {/* TUTOR UPCOMING */}
                {role === 'tutor' && sess.status === 'upcoming' && (
                  <View style={tw`mt-2`}>
                    <TouchableOpacity
                      style={tw`bg-green-500 py-2 rounded-lg mb-2`}
                      onPress={() => handleAcceptSession(sess.id)}
                    >
                      <Text style={tw`text-white text-center font-bold`}>
                        Accept Session
                      </Text>
                    </TouchableOpacity>
                    <TextInput
                      placeholder="Cancel reason"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      style={tw`bg-gray-700 text-gray-300 p-3 rounded-lg border border-gray-600 mb-2`}
                      value={cancelReasons[sess.id] ?? ''}
                      onChangeText={r => handleCancelReasonChange(sess.id, r)}
                    />
                    <TouchableOpacity
                      style={tw`bg-red-500 py-2 rounded-lg`}
                      onPress={() => confirmCancelSession(sess.id, role!, sess.status)}
                    >
                      <Text style={tw`text-white text-center font-bold`}>
                        Cancel Session
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* REVIEWS */}
        {activeTab === 'reviews' && (
          <View style={tw`bg-gray-800 p-6 rounded-lg mb-4`}>
            <Text style={tw`text-xl font-semibold text-blue-400 mb-4 text-center`}>
              Post a Review
            </Text>
            <TextInput
              placeholder="Tutor ID"
              placeholderTextColor="#9CA3AF"
              style={tw`bg-gray-900 text-gray-300 p-3 rounded mb-2`}
              onChangeText={t => setFormData({ ...formData, tutorId: t })}
            />
            <TextInput
              placeholder="Comment"
              placeholderTextColor="#9CA3AF"
              style={tw`bg-gray-900 text-gray-300 p-3 rounded mb-2`}
              multiline
              onChangeText={t => setFormData({ ...formData, comment: t })}
            />
            <TextInput
              placeholder="Rating (1-5)"
              placeholderTextColor="#9CA3AF"
              style={tw`bg-gray-900 text-gray-300 p-3 rounded mb-2`}
              keyboardType="numeric"
              value={ratingData.rating}
              onChangeText={t => setRatingData({ ...ratingData, rating: t })}
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
            <Text style={tw`text-xl font-semibold text-blue-400 mb-4 text-center`}>
              Your Earnings
            </Text>
            {earnings.map((e: EarningType) => (
              <View key={e.id} style={tw`bg-gray-800 p-4 rounded-lg mb-4`}>
                <Text style={tw`text-gray-300`}>Amount: ${e.amount}</Text>
                <Text style={tw`text-gray-300`}>Description: {e.description}</Text>
                <Text style={tw`text-gray-300`}>
                  Date: {new Date(e.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* RATING MODAL */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={tw`absolute inset-0 bg-black bg-opacity-50 justify-center items-center`}>
          <View style={tw`bg-gray-800 p-6 rounded w-11/12 max-w-md`}>
            <Text style={tw`text-xl font-bold text-white mb-4 text-center`}>Rate Your Tutor</Text>
            {/* Rating dropdown */}
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
            <TextInput
              multiline
              value={ratingData.comment}
              onChangeText={t => setRatingData({ ...ratingData, comment: t })}
              placeholder="Leave a comment (optional)…"
              placeholderTextColor="#9CA3AF"
              style={tw`bg-gray-700 text-white p-2 rounded h-20 mt-4`}
            />
            <View style={tw`flex-row justify-end mt-4`}>
              <TouchableOpacity
                onPress={() => setShowRatingModal(false)}
                style={tw`mr-2`}
              >
                <Text style={tw`text-gray-300`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleReviewSubmission}>
                <Text style={tw`text-pink-500`}>Submit Rating</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export default AccountSectionNative
