// /apps/mobile/src/screens/PaymentScreen.native.tsx
import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import usePayment from '@shared/hooks/usePayment';
import { useNavigation } from '@react-navigation/native';
import tw from 'twrnc';

// Define a union type for payment method keys.
type PaymentMethodKey = "visamastercard" | "mpesa" | "paypal" | "cryptos";

// Define assets for payment icons. Adjust these paths as necessary.
const assets: { [key in PaymentMethodKey]: any } = {
  visamastercard: require('../../assets/visamastercard.png'),
  mpesa: require('../../assets/mpesa.png'),
  paypal: require('../../assets/paypal.png'),
  cryptos: require('../../assets/cryptos.png'),
};

const TutorRating = ({ rating, totalReviews }: { rating: number; totalReviews: number }) => {
  const roundedRating = Math.round(rating * 2) / 2;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (roundedRating >= i) {
      stars.push('★');
    } else if (roundedRating + 0.5 === i) {
      stars.push('☆'); // using empty star for half rating
    } else {
      stars.push('☆');
    }
  }
  return (
    <View style={tw`flex-row items-center`}>
      <Text>{stars.join(' ')}</Text>
      <Text style={tw`ml-2 text-xs text-gray-200`}>
        ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
      </Text>
    </View>
  );
};

const PaymentScreen = () => {
  const navigation = useNavigation();
  const {
    packages,
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
    pollingPayment,
    transactionReference,
    handleInitiateMpesaPayment,
    handleCompletePayment,
    mpesaReference,
    setMpesaReference,
    handleUpdateMpesaReference,
    handleCheckout,
  } = usePayment();

  if (loadingProfile) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-900`}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={tw`text-white mt-2`}>Loading tutor profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={tw`bg-gray-900 min-h-screen p-4`}>
      {/* Header */}
      <View style={tw`mb-6`}>
        <Text style={tw`text-xl text-pink-300 font-light text-center`}>
          Get Session Tokens
        </Text>
        <Text style={tw`text-center text-gray-400 text-sm mt-2`}>
          Select your token package first, then choose a payment method.
        </Text>
      </View>

      {/* Tutor Display Section */}
      <View style={tw`bg-gray-800 p-6 rounded-lg shadow-md mb-6`}>
        {profile ? (
          <>
            <View style={tw`w-full h-64 overflow-hidden mb-4`}>
              <Image
                source={{ uri: mainImage ?? '' }}
                style={tw`w-full h-full rounded-lg`}
                resizeMode="cover"
              />
            </View>
            <Text style={tw`text-lg text-pink-300 font-semibold`}>{profile.name}</Text>
            <View style={tw`mt-4 bg-gray-800 p-4 rounded-lg shadow-md`}>
              <Text style={tw`text-pink-500 font-semibold`}>Category:</Text>
              <Text style={tw`text-gray-300 mt-1 text-xs`}>{profile.category || 'Not specified'}</Text>
            </View>
            <View style={tw`mt-2 bg-gray-800 p-4 rounded-lg shadow-md`}>
              <Text style={tw`text-pink-500 font-semibold`}>Expertise:</Text>
              {profile.expertise?.length > 0 ? (
                <View style={tw`flex-row flex-wrap mt-1`}>
                  {profile.expertise.map((skill: string, index: number) => (
                    <Text
                      key={index}
                      style={tw`px-2 py-1 border border-pink-500 text-gray-300 rounded-full text-xs mr-1 mb-1`}
                    >
                      {skill}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={tw`text-gray-300 mt-1 text-xs`}>Not specified</Text>
              )}
            </View>
            <View style={tw`mt-2 bg-gray-800 p-4 rounded-lg shadow-md`}>
              <Text style={tw`text-pink-500 font-semibold`}>Teaching Style:</Text>
              {profile.teachingStyle?.length > 0 ? (
                <View style={tw`flex-row flex-wrap mt-1`}>
                  {profile.teachingStyle.map((style: string, index: number) => (
                    <Text
                      key={index}
                      style={tw`px-2 py-1 border border-pink-500 text-gray-300 rounded-full text-xs mr-1 mb-1`}
                    >
                      {style}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={tw`text-gray-300 mt-1 text-xs`}>Not specified</Text>
              )}
            </View>
            <View style={tw`mt-2 bg-gray-800 p-4 rounded-lg shadow-md`}>
              <Text style={tw`text-pink-500 font-semibold`}>Rating:</Text>
              <TutorRating rating={ratingData.avgRating} totalReviews={ratingData.totalReviews} />
            </View>
          </>
        ) : (
          <Text style={tw`text-sm text-gray-300`}>No tutor profile found.</Text>
        )}
      </View>

      {/* Package and Payment Selection */}
      <View style={tw`flex flex-col gap-6`}>
        <View style={tw`mb-6`}>
          <Text style={tw`text-lg font-bold text-pink-300 mb-3`}>Choose Your Package</Text>
          {packages.length > 0 ? (
            packages.map((pkg: any) => (
              <TouchableOpacity
                key={pkg.id}
                onPress={() => handlePackageSelection(pkg)}
                style={tw`p-3 border rounded-lg mb-2 ${selectedPackage?.id === pkg.id ? 'border-pink-300 bg-gray-700' : 'border-gray-600'}`}
              >
                <Text style={tw`font-semibold text-gray-200`}>{pkg.credits} Tokens</Text>
                <Text style={tw`text-gray-400`}>{pkg.offer}</Text>
                <Text style={tw`text-base font-bold text-pink-300`}>Kshs {pkg.price}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={tw`text-sm text-gray-300`}>No packages available.</Text>
          )}
        </View>

        <View>
          <Text style={tw`text-lg font-semibold text-gray-300 mb-3`}>Choose Your Payment Method</Text>
          <View style={tw`flex-row flex-wrap justify-between`}>
            {['Visa/MasterCard', 'M-Pesa', 'PayPal', 'Cryptos'].map((method) => {
              const methodKey = method.replace(/\s/g, '').toLowerCase() as PaymentMethodKey;
              return (
                <TouchableOpacity
                  key={method}
                  onPress={() => handlePaymentSelection(method)}
                  style={tw`w-1/2 h-16 bg-white p-2 rounded-md flex items-center justify-center mb-2`}
                >
                  <Image
                    source={assets[methodKey]}
                    style={tw`w-full h-full`}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedPaymentMethod && selectedPaymentMethod !== 'MPESA' && (
            <TouchableOpacity
              onPress={handleCheckout}
              style={tw`w-full mt-4 py-2 rounded-md bg-pink-300`}
            >
              <Text style={tw`text-center text-white`}>{`Buy ${selectedPackage?.credits || 0} Tokens`}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* M-Pesa Modal */}
      {showMpesaModal && (
        <Modal visible={showMpesaModal} transparent animationType="slide">
          <View style={tw`flex-1 justify-center items-center bg-gray-900 bg-opacity-90 px-4`}>
            <View style={tw`bg-gray-800 p-6 rounded-lg w-full max-w-sm`}>
              <Text style={tw`text-lg font-bold mb-4 text-pink-300`}>Complete M-Pesa Payment</Text>
              <Text style={tw`text-gray-300 text-xs mb-4`}>
                Enter your Safaricom phone number below. First, initiate the payment to receive an STK push.
              </Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="e.g., 2547XXXXXXXX"
                style={tw`w-full p-2 border rounded mb-4 bg-white text-black text-xs`}
                keyboardType="phone-pad"
              />
              <View style={tw`flex-row justify-end space-x-2 mb-4`}>
                <TouchableOpacity
                  onPress={() => setShowMpesaModal(false)}
                  style={tw`px-3 py-2 bg-gray-700 rounded`}
                >
                  <Text style={tw`text-white text-xs`}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleInitiateMpesaPayment}
                  disabled={initiatingPayment}
                  style={tw`px-3 py-2 bg-blue-600 rounded`}
                >
                  {initiatingPayment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={tw`text-white text-xs`}>Initiate Payment</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCompletePayment}
                  disabled={pollingPayment}
                  style={tw`px-3 py-2 bg-green-600 rounded`}
                >
                  {pollingPayment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={tw`text-white text-xs`}>Complete Payment</Text>
                  )}
                </TouchableOpacity>
              </View>
              <View style={tw`border-t border-gray-700 pt-4`}>
                <Text style={tw`text-gray-300 text-xs mb-2`}>
                  If your payment did not complete due to network issues, you can update your M-Pesa reference number.
                </Text>
                <TextInput
                  value={mpesaReference}
                  onChangeText={setMpesaReference}
                  placeholder="Enter reference number"
                  style={tw`w-full p-2 border rounded mb-4 bg-white text-black text-xs`}
                />
                <TouchableOpacity
                  onPress={handleUpdateMpesaReference}
                  style={tw`w-full bg-orange-600 py-2 rounded-lg`}
                >
                  <Text style={tw`text-center text-white text-xs`}>Update Payment Reference</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

export default PaymentScreen;
