import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Navbar from '../screens/Navbar.native';
import Footer from '../screens/Footer.native';
import { assets } from '../../assets/assets';
import Spinner from '../screens/Spinner.native';
import { FontAwesome } from '@expo/vector-icons';
import { usePayment } from '@mytutorapp/shared/hooks';
import debounce from 'lodash.debounce';
import tw from '../../tailwind';

interface Package {
  id: string;
  credits: number;
  offer: string;
  price: number;
}

const TutorRating: React.FC<{
  rating: number;
  totalReviews: number;
}> = ({ rating, totalReviews }) => {
  const roundedRating = Math.round(rating * 2) / 2;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (roundedRating >= i) {
      stars.push(<FontAwesome key={i} name="star" size={16} color="#FBBF24" />);
    } else if (roundedRating + 0.5 === i) {
      stars.push(<FontAwesome key={i} name="star-half-full" size={16} color="#FBBF24" />);
    } else {
      stars.push(<FontAwesome key={i} name="star-o" size={16} color="#FBBF24" />);
    }
  }
  return (
    <View style={tw`flex-row items-center`}>
      {stars}
      <Text style={tw`ml-2 text-xs text-gray-200`}>
        ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
      </Text>
    </View>
  );
};

const PaymentScreen: React.FC = () => {
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
    handleInitiateMpesaPayment,
    handleCompletePayment,
    mpesaReference,
    setMpesaReference,
    handleUpdateMpesaReference,
    handleCheckout,
  } = usePayment();

  const debouncedCheckout = useMemo(() => debounce(() => handleCheckout(), 300), [
    handleCheckout,
  ]);
  const debouncedInitiateMpesaPayment = useMemo(
    () => debounce(() => handleInitiateMpesaPayment(), 300),
    [handleInitiateMpesaPayment]
  );
  const debouncedUpdateMpesaReference = useMemo(
    () => debounce(() => handleUpdateMpesaReference(), 300),
    [handleUpdateMpesaReference]
  );

  useEffect(() => {
    return () => {
      debouncedCheckout.cancel();
      debouncedInitiateMpesaPayment.cancel();
      debouncedUpdateMpesaReference.cancel();
    };
  }, [debouncedCheckout, debouncedInitiateMpesaPayment, debouncedUpdateMpesaReference]);

  return (
    <View style={tw`bg-gray-900 flex-1`}>
      <Navbar onSearch={(term: string) => { /* no-op */ }} />

      <ScrollView
        style={tw``}
        contentContainerStyle={tw`flex-grow items-center p-4`}
      >
        <Text style={tw`text-xl font-light text-softPink mb-2`}>
          Get Session Tokens
        </Text>
        <Text style={tw`text-center max-w-2xl text-gray-400 text-sm mb-4`}>
          Select your token package first, then choose a payment method to book tutoring sessions
          with ease.
        </Text>

        <View style={tw`flex-col lg:flex-row gap-6 w-full max-w-6xl`}>
          <View style={tw`hidden lg:flex bg-gray-800 p-6 rounded-lg shadow-md w-full lg:w-1/2 items-center`}>
            {loadingProfile ? (
              <Text style={tw`text-sm`}>Loading tutor profile...</Text>
            ) : profile ? (
              <>
                <View style={tw`w-full h-[500px] overflow-hidden mb-4`}>
                  <Image
                    source={mainImage ? { uri: mainImage } : assets.logo}
                    style={tw`w-full h-full rounded-lg`}
                    resizeMode="cover"
                  />
                </View>
                <Text style={tw`text-lg font-semibold text-softPink`}>
                  {profile.name}
                </Text>

                <View style={tw`max-w-4xl mx-auto mt-4 bg-gray-800 p-4 rounded-lg shadow-md`}>
                  <Text style={tw`font-semibold text-pink-500`}>Category:</Text>
                  <Text style={tw`text-gray-300 mt-1 text-xs`}>
                    {profile.category || 'Not specified'}
                  </Text>
                </View>

                <View style={tw`max-w-4xl mx-auto mt-2 bg-gray-800 p-4 rounded-lg shadow-md`}>
                  <Text style={tw`font-semibold text-pink-500`}>Expertise:</Text>
                  {profile.expertise && profile.expertise.length > 0 ? (
                    <View style={tw`flex-row flex-wrap gap-2 mt-1`}>
                      {profile.expertise.map((skill, i) => (
                        <Text
                          key={i}
                          style={tw`px-2 py-1 border border-pink-500 text-gray-300 rounded-full text-xs`}
                        >
                          {skill}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={tw`text-gray-300 mt-1 text-xs`}>Not specified</Text>
                  )}
                </View>

                <View style={tw`max-w-4xl mx-auto mt-2 bg-gray-800 p-4 rounded-lg shadow-md`}>
                  <Text style={tw`font-semibold text-pink-500`}>Teaching Style:</Text>
                  {profile.teachingStyle && profile.teachingStyle.length > 0 ? (
                    <View style={tw`flex-row flex-wrap gap-2 mt-1`}>
                      {profile.teachingStyle.map((style, i) => (
                        <Text
                          key={i}
                          style={tw`px-2 py-1 border border-pink-500 text-gray-300 rounded-full text-xs`}
                        >
                          {style}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={tw`text-gray-300 mt-1 text-xs`}>Not specified</Text>
                  )}
                </View>

                <View style={tw`max-w-4xl mx-auto mt-2 bg-gray-800 p-4 rounded-lg shadow-md`}>
                  <Text style={tw`font-semibold text-pink-500`}>Rating:</Text>
                  <TutorRating
                    rating={ratingData.avgRating}
                    totalReviews={ratingData.totalReviews}
                  />
                </View>
              </>
            ) : (
              <Text style={tw`text-sm`}>No tutor profile found.</Text>
            )}
          </View>

          <View style={tw`flex-col gap-6 w-full lg:w-1/2`}>
            <Text style={tw`text-lg font-bold text-softPink mb-3`}>
              Choose Your Package
            </Text>
            {packages.length > 0 ? (
              packages.map((pkg) => (
                <TouchableOpacity key={pkg.id} onPress={() => handlePackageSelection(pkg)}>
                  <Text style={tw`font-semibold text-gray-200`}>{pkg.credits} Tokens</Text>
                  <Text style={tw`text-gray-400`}>{pkg.offer}</Text>
                  <Text style={tw`text-base font-bold text-softPink`}>
                    Kshs {pkg.price}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={tw`text-sm`}>No packages available.</Text>
            )}

            <View style={tw`relative bg-gray-800 p-6 rounded-lg shadow-md`}>
              {!selectedPackage && (
                <View style={tw`absolute inset-0 bg-softPink bg-opacity-50 rounded-lg items-center justify-center`}>
                  <Text style={tw`text-white font-semibold text-xs`}>
                    Please select a package first
                  </Text>
                </View>
              )}

              <Text style={tw`text-lg font-semibold text-gray-300 mb-3`}>
                Choose Your Payment Method
              </Text>
              <View style={tw`flex-row flex-wrap justify-between`}>
                <TouchableOpacity
                  style={tw`w-1/2 h-16 bg-white p-2 rounded-md items-center justify-center`}
                  onPress={() => handlePaymentSelection('Visa/MasterCard')}
                >
                  <Image
                    source={assets.visamaster}
                    style={tw`w-full h-full`}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`w-1/2 h-16 bg-white p-2 rounded-md items-center justify-center`}
                  onPress={() => handlePaymentSelection('M-Pesa')}
                >
                  <Image
                    source={assets.mpesa}
                    style={tw`w-full h-full`}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`w-1/2 h-16 bg-white p-2 rounded-md items-center justify-center`}
                  onPress={() => handlePaymentSelection('PayPal')}
                >
                  <Image
                    source={assets.paypal}
                    style={tw`w-full h-full`}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`w-1/2 h-16 bg-white p-2 rounded-md items-center justify-center`}
                  onPress={() => handlePaymentSelection('Cryptos')}
                >
                  <Image
                    source={assets.crypto}
                    style={tw`w-full h-full`}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              {selectedPaymentMethod && selectedPaymentMethod !== 'M-Pesa' && (
                <TouchableOpacity
                  onPress={() => debouncedCheckout()}
                  style={tw`w-full mt-4 py-2 rounded-md bg-softPink items-center`}
                >
                  <Text style={tw`text-center text-xs font-semibold text-white`}>
                    Buy {selectedPackage?.credits || 0} Tokens
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <Footer />

      {showMpesaModal && (
        <View style={tw`absolute inset-0 bg-gray-900 bg-opacity-90 items-center justify-center px-4`}>
          <View style={tw`bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-sm`}>
            <Text style={tw`text-lg font-bold mb-4 text-softPink`}>
              Complete M-Pesa Payment
            </Text>
            <Text style={tw`text-gray-300 text-xs mb-4`}>
              Enter your Safaricom phone number below. First, initiate the payment to receive an STK
              push.
            </Text>
            <View style={tw`mb-4`}>
              <Text style={tw`text-gray-300 text-xs`}>Phone Number</Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="e.g., 2547XXXXXXXX"
                placeholderTextColor="#6B7280"
                style={tw`w-full p-2 border rounded mt-1 text-black text-xs`}
              />
            </View>
            <View style={tw`flex-row justify-end space-x-2 mb-4`}>
              <TouchableOpacity
                onPress={() => setShowMpesaModal(false)}
                style={tw`px-3 py-2 bg-gray-700 rounded`}
              >
                <Text style={tw`text-xs text-gray-300`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => debouncedInitiateMpesaPayment()}
                disabled={initiatingPayment}
                style={tw`px-3 py-2 bg-blue-600 rounded`}
              >
                {initiatingPayment ? <Spinner /> : <Text style={tw`text-xs text-white`}>Initiate Payment</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCompletePayment}
                style={tw`px-3 py-2 bg-green-600 rounded`}
              >
                <Text style={tw`text-xs text-white`}>Complete Payment</Text>
              </TouchableOpacity>
            </View>
            <View style={tw`border-t border-gray-700 pt-4`}>
              <Text style={tw`text-gray-300 text-xs mb-2`}>
                If your payment did not complete due to network issues, you can update your M-Pesa
                reference number below.
              </Text>
              <View style={tw`mb-4`}>
                <Text style={tw`text-gray-300 text-xs`}>M-Pesa Reference Number</Text>
                <TextInput
                  value={mpesaReference}
                  onChangeText={setMpesaReference}
                  placeholder="Enter reference number"
                  placeholderTextColor="#6B7280"
                  style={tw`w-full p-2 border rounded mt-1 text-black text-xs`}
                />
              </View>
              <TouchableOpacity
                onPress={() => debouncedUpdateMpesaReference()}
                style={tw`w-full bg-orange-600 py-2 rounded-lg items-center`}
              >
                <Text style={tw`text-xs text-white`}>Update Payment Reference</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default PaymentScreen;
