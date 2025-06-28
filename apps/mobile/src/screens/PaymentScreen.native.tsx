// apps/mobile/src/screens/PaymentScreen.native.tsx

import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Spinner from '../screens/Spinner.native';
import { FontAwesome } from '@expo/vector-icons';
import { usePayment } from '@mytutorapp/shared/hooks';
import debounce from 'lodash.debounce';
import tw from '../../tailwind';
import { assets } from '../../assets/assets';

// ← Import useNavigation
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { MainStackParamList } from '../navigation/types';

const TutorRating: React.FC<{
  rating: number;
  totalReviews: number;
}> = ({ rating, totalReviews }) => {
  // … your existing TutorRating code …
  const rounded = Math.round(rating * 2) / 2;
  const stars = Array.from({ length: 5 }, (_, i) => {
    const idx = i + 1;
    if (rounded >= idx) return 'star';
    if (rounded + 0.5 === idx) return 'star-half-full';
    return 'star-o';
  }) as ('star' | 'star-half-full' | 'star-o')[];

  return (
    <View style={tw`flex-row items-center`}>
      {stars.map((name, i) => (
        <FontAwesome key={i} name={name} size={16} color="#FBBF24" />
      ))}
      <Text style={tw`ml-2 text-xs text-gray-200`}>
        ({totalReviews} review{totalReviews === 1 ? '' : 's'})
      </Text>
    </View>
  );
};

const PaymentScreen: React.FC = () => {
  // ← Grab navigation from React Navigation
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();

  const {
    packages,
    loadingPackages,
    packagesError,
    selectedPackage,
    handlePackageSelection,
    profile,
    mainImage,
    loadingProfile,
    ratingData,
    selectedPaymentMethod,
    handlePaymentSelection,
    phoneNumber,
    setPhoneNumber,
    showMpesaModal,
    setShowMpesaModal,
    initiatingPayment,
    handleInitiateMpesaPayment,
    handleCompletePayment,
    mpesaReference,
    setMpesaReference,
    handleUpdateMpesaReference,
    handleCheckout,
  } = usePayment();

  const debouncedCheckout = useMemo(
    () => debounce(handleCheckout, 300),
    [handleCheckout]
  );
  const debouncedInitiate = useMemo(
    () => debounce(handleInitiateMpesaPayment, 300),
    [handleInitiateMpesaPayment]
  );
  const debouncedUpdate = useMemo(
    () => debounce(handleUpdateMpesaReference, 300),
    [handleUpdateMpesaReference]
  );

  useEffect(() => {
    return () => {
      debouncedCheckout.cancel();
      debouncedInitiate.cancel();
      debouncedUpdate.cancel();
    };
  }, [debouncedCheckout, debouncedInitiate, debouncedUpdate]);

  if (loadingPackages || loadingProfile) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <Spinner />
      </View>
    );
  }

  if (packagesError) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900 p-4`}>
        <Text style={tw`text-red-400 text-lg mb-2`}>Error</Text>
        <Text style={tw`text-gray-200 text-center mb-4`}>
          {packagesError}
        </Text>
        <TouchableOpacity
          onPress={handleCheckout}
          style={tw`px-4 py-2 bg-softPink rounded`}
        >
          <Text style={tw`text-white`}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={tw`bg-gray-900 flex-1`}>
      <ScrollView
        contentContainerStyle={tw`pt-12 p-4`} // extra top padding under navbar
      >
        {/* Header */}
        <Text style={tw`text-2xl font-semibold text-softPink mb-2`}>
          Get Session Tokens
        </Text>
        <Text style={tw`text-center text-gray-400 text-sm mb-6`}>
          Select a token package, then complete your payment to book tutoring
          sessions seamlessly.
        </Text>

        {/* Two-column layout */}
        <View style={tw`flex-col lg:flex-row`}>
          {/* Left column: profile (desktop-only) */}
          {profile && (
            <View
              style={tw`hidden lg:flex w-1/2 bg-gray-800 p-6 rounded-lg mb-6 lg:mb-0 lg:mr-4`}
            >
              <View style={tw`w-full h-64 mb-4`}>
                <Image
                  source={mainImage ? { uri: mainImage } : assets.logo}
                  style={tw`w-full h-full rounded-lg`}
                  resizeMode="cover"
                />
              </View>
              <Text style={tw`text-lg font-semibold text-softPink mb-4`}>
                {profile.name}
              </Text>
              <View style={tw`mb-4`}>
                <Text style={tw`font-semibold text-pink-500`}>Category:</Text>
                <Text style={tw`text-gray-300 text-xs mt-1`}>
                  {profile.category || 'Not specified'}
                </Text>
              </View>
              <View style={tw`mb-4`}>
                <Text style={tw`font-semibold text-pink-500`}>Expertise:</Text>
                <View style={tw`flex-row flex-wrap mt-1`}>
                  {(profile.expertise?.length
                    ? profile.expertise
                    : ['Not specified']
                  ).map((skill, i) => (
                    <Text
                      key={i}
                      style={tw`px-2 py-1 border border-pink-500 text-gray-300 rounded-full text-xs mr-2 mb-2`}
                    >
                      {skill}
                    </Text>
                  ))}
                </View>
              </View>
              <View style={tw`mb-4`}>
                <Text style={tw`font-semibold text-pink-500`}>
                  Teaching Style:
                </Text>
                <View style={tw`flex-row flex-wrap mt-1`}>
                  {(profile.teachingStyle?.length
                    ? profile.teachingStyle
                    : ['Not specified']
                  ).map((style, i) => (
                    <Text
                      key={i}
                      style={tw`px-2 py-1 border border-pink-500 text-gray-300 rounded-full text-xs mr-2 mb-2`}
                    >
                      {style}
                    </Text>
                  ))}
                </View>
              </View>
              <View>
                <Text style={tw`font-semibold text-pink-500 mb-1`}>Rating:</Text>
                <TutorRating
                  rating={ratingData.avgRating}
                  totalReviews={ratingData.totalReviews}
                />
              </View>
            </View>
          )}

          {/* Right column: purchase */}
          <View style={tw`flex-1`}>
            {/* Package selection */}
            <Text style={tw`text-lg font-bold text-softPink mb-4`}>
              Choose Your Package
            </Text>
            {packages.map((pkg) => {
              const isSelected = selectedPackage?.id === pkg.id;
              return (
                <TouchableOpacity
                  key={pkg.id}
                  onPress={() => handlePackageSelection(pkg)}
                  style={tw.style(
                    'p-4 rounded-lg mb-4',
                    isSelected
                      ? 'border-2 border-softPink bg-gray-800'
                      : 'border border-gray-700'
                  )}
                >
                  <Text style={tw`text-white font-semibold mb-1`}>
                    {pkg.credits} Tokens
                  </Text>
                  <Text style={tw`text-gray-400 mb-1`}>{pkg.offer}</Text>
                  <Text style={tw`text-softPink font-bold`}>
                    Kshs {pkg.price}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {packages.length === 0 && (
              <Text style={tw`text-gray-400 text-center`}>No packages available.</Text>
            )}

            {/* Payment method */}
            <View style={tw`bg-gray-800 p-6 rounded-lg`}>
              {!selectedPackage && (
                <View
                  style={tw`absolute inset-0 bg-softPink bg-opacity-50 rounded-lg items-center justify-center`}
                >
                  <Text style={tw`text-white font-semibold text-xs`}>
                    Please select a package first
                  </Text>
                </View>
              )}
              <Text style={tw`text-lg font-semibold text-gray-300 mb-4`}>
                Choose Payment Method
              </Text>
              <View style={tw`flex-row flex-wrap justify-between mb-4`}>
                {(['Visa/MasterCard', 'M-Pesa', 'PayPal', 'Cryptos'] as const).map(
                  (method) => (
                    <TouchableOpacity
                      key={method}
                      onPress={() => handlePaymentSelection(method)}
                      style={tw`w-[48%] h-16 bg-white p-2 rounded-md mb-4 items-center justify-center`}
                    >
                      <Image
                        source={
                          method === 'Visa/MasterCard'
                            ? assets.visamaster
                            : method === 'M-Pesa'
                            ? assets.mpesa
                            : method === 'PayPal'
                            ? assets.paypal
                            : assets.crypto
                        }
                        style={tw`w-full h-full`}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  )
                )}
              </View>

              {selectedPaymentMethod && selectedPaymentMethod !== 'M-Pesa' && (
                <TouchableOpacity
                  onPress={() => debouncedCheckout()}
                  style={tw`w-full py-2 rounded-md bg-softPink items-center`}
                >
                  <Text style={tw`text-white text-xs font-semibold`}>
                    Pay Kshs {selectedPackage?.price || 0}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* M-Pesa Modal */}
      {showMpesaModal && (
        <View style={tw`absolute inset-0 bg-gray-900 bg-opacity-90 items-center justify-center px-4`}>
          <View style={tw`bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-sm`}>
            <Text style={tw`text-lg font-bold mb-4 text-softPink`}>
              Complete M-Pesa Payment
            </Text>
            <Text style={tw`text-gray-300 text-xs mb-4`}>
              Enter your Safaricom phone number. Initiate an STK push to complete.
            </Text>

            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-300 text-xs mb-1`}>Phone Number</Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="2547XXXXXXXX"
                placeholderTextColor="#6B7280"
                style={tw`w-full p-2 border rounded text-white text-xs`}
              />
            </View>

            <View style={tw`flex-row justify-end mb-4`}>
              <TouchableOpacity
                onPress={() => setShowMpesaModal(false)}
                style={tw`px-3 py-2 bg-gray-700 rounded mr-2`}
              >
                <Text style={tw`text-xs text-gray-300`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => debouncedInitiate()}
                disabled={initiatingPayment}
                style={tw`px-3 py-2 bg-blue-600 rounded mr-2`}
              >
                {initiatingPayment ? (
                  <Spinner />
                ) : (
                  <Text style={tw`text-xs text-white`}>Initiate</Text>
                )}
              </TouchableOpacity>

              {/* ← UPDATED: Await completePayment, then goBack() */}
              <TouchableOpacity
                onPress={async () => {
                  try {
                    await handleCompletePayment();
                    navigation.goBack(); // pop back to AccountSection
                  } catch (err) {
                    // Optionally show an alert if something went wrong
                    Alert.alert('Payment Error','Payment failed. Please try again.',
                     [{ text: 'OK' }]
   )
                  }
                }}
                style={tw`px-3 py-2 bg-green-600 rounded`}
              >
                <Text style={tw`text-xs text-white`}>Complete</Text>
              </TouchableOpacity>
            </View>

            <Text style={tw`text-gray-300 text-xs mb-2`}>
              Or update your M-Pesa reference if needed:
            </Text>
            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-300 text-xs mb-1`}>Reference Number</Text>
              <TextInput
                value={mpesaReference}
                onChangeText={setMpesaReference}
                placeholder="e.g. AB1234"
                placeholderTextColor="#6B7280"
                style={tw`w-full p-2 border rounded text-white text-xs`}
              />
            </View>
            <TouchableOpacity
              onPress={() => debouncedUpdate()}
              style={tw`w-full py-2 bg-orange-600 rounded items-center`}
            >
              <Text style={tw`text-xs text-white`}>Update Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

export default PaymentScreen;
