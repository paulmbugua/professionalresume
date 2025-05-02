import { useMemo, useEffect } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import Navbar from '../screens/Navbar.native'; // native version
import Footer from '../screens/Footer.native';
import { assets } from '../../assets/assets';
import Spinner from '../screens/Spinner.native';
import { FontAwesome } from '@expo/vector-icons';
import { usePayment } from '@mytutorapp/shared/hooks';
import debounce from 'lodash.debounce';

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
    <View className="flex-row items-center">
      {stars}
      <Text className="ml-2 text-xs text-gray-200">
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

  // Debounced versions
  const debouncedCheckout = useMemo(() => debounce(() => handleCheckout(), 300), [handleCheckout]);
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
    <View className="bg-gray-900 flex-1">
      {/* Navbar now correctly typed */}
      <Navbar
        onSearch={(term: string) => {
          /* no-op */
        }}
      />

      <ScrollView contentContainerClassName="flex-grow items-center p-4 md:p-8 lg:p-12">
        <Text className="text-xl md:text-3xl font-light text-softPink mb-2">
          Get Session Tokens
        </Text>
        <Text className="text-center max-w-2xl text-gray-400 text-sm md:text-lg mb-4">
          Select your token package first, then choose a payment method to book tutoring sessions
          with ease.
        </Text>

        <View className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl">
          {/* Tutor Preview (desktop-only) */}
          <View className="hidden lg:flex bg-gray-800 p-6 rounded-lg shadow-md w-full lg:w-1/2 text-center flex-col items-center">
            {loadingProfile ? (
              <Text className="text-sm">Loading tutor profile...</Text>
            ) : profile ? (
              <>
                <View className="w-full h-[500px] overflow-hidden mb-4">
                  <Image
                    source={mainImage ? { uri: mainImage } : assets.logo}
                    className="w-full h-full rounded-lg"
                    resizeMode="cover"
                  />
                </View>
                <Text className="text-lg md:text-xl font-semibold text-softPink">
                  {profile.name}
                </Text>

                {/* Category */}
                <View className="max-w-4xl mx-auto mt-4 bg-gray-800 p-4 rounded-lg shadow-md">
                  <Text className="font-semibold text-pink-500">Category:</Text>
                  <Text className="text-gray-300 mt-1 text-xs md:text-sm">
                    {profile.category || 'Not specified'}
                  </Text>
                </View>

                {/* Expertise */}
                <View className="max-w-4xl mx-auto mt-2 bg-gray-800 p-4 rounded-lg shadow-md">
                  <Text className="font-semibold text-pink-500">Expertise:</Text>
                  {profile.expertise && profile.expertise.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2 mt-1">
                      {profile.expertise.map((skill: string, index: number) => (
                        <Text
                          key={index}
                          className="px-2 py-1 border border-pink-500 text-gray-300 rounded-full text-xs"
                        >
                          {skill}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text className="text-gray-300 mt-1 text-xs">Not specified</Text>
                  )}
                </View>

                {/* Teaching Style */}
                <View className="max-w-4xl mx-auto mt-2 bg-gray-800 p-4 rounded-lg shadow-md">
                  <Text className="font-semibold text-pink-500">Teaching Style:</Text>
                  {profile.teachingStyle && profile.teachingStyle.length > 0 ? (
                    <View className="flex-row flex-wrap gap-2 mt-1">
                      {profile.teachingStyle.map((style: string, index: number) => (
                        <Text
                          key={index}
                          className="px-2 py-1 border border-pink-500 text-gray-300 rounded-full text-xs"
                        >
                          {style}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text className="text-gray-300 mt-1 text-xs">Not specified</Text>
                  )}
                </View>

                {/* Rating */}
                <View className="max-w-4xl mx-auto mt-2 bg-gray-800 p-4 rounded-lg shadow-md">
                  <Text className="font-semibold text-pink-500">Rating:</Text>
                  <TutorRating
                    rating={ratingData.avgRating}
                    totalReviews={ratingData.totalReviews}
                  />
                </View>
              </>
            ) : (
              <Text className="text-sm">No tutor profile found.</Text>
            )}
          </View>

          {/* Packages & Payment */}
          <View className="flex flex-col gap-6 w-full lg:w-1/2">
            <Text className="text-lg md:text-2xl font-bold text-softPink mb-3">
              Choose Your Package
            </Text>
            {packages.length > 0 ? (
              packages.map((pkg: Package) => (
                <TouchableOpacity key={pkg.id} onPress={() => handlePackageSelection(pkg)}>
                  <Text className="font-semibold text-gray-200">{pkg.credits} Tokens</Text>
                  <Text className="text-gray-400">{pkg.offer}</Text>
                  <Text className="text-base font-bold text-softPink">Kshs {pkg.price}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text className="text-sm">No packages available.</Text>
            )}

            <View className="relative bg-gray-800 p-6 rounded-lg shadow-md">
              {!selectedPackage && (
                <View className="absolute inset-0 bg-softPink bg-opacity-50 rounded-lg flex items-center justify-center">
                  <Text className="text-white font-semibold text-xs">
                    Please select a package first
                  </Text>
                </View>
              )}

              <Text className="text-lg md:text-2xl font-semibold text-gray-300 mb-3">
                Choose Your Payment Method
              </Text>
              <View className="flex-row flex-wrap justify-between">
                <TouchableOpacity
                  onPress={() => handlePaymentSelection('Visa/MasterCard')}
                  className="w-1/2 h-16 bg-white p-2 rounded-md flex items-center justify-center"
                >
                  <Image
                    source={assets.visamaster}
                    className="w-full h-full"
                    resizeMode="contain"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handlePaymentSelection('M-Pesa')}
                  className="w-1/2 h-16 bg-white p-2 rounded-md flex items-center justify-center"
                >
                  <Image source={assets.mpesa} className="w-full h-full" resizeMode="contain" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handlePaymentSelection('PayPal')}
                  className="w-1/2 h-16 bg-white p-2 rounded-md flex items-center justify-center"
                >
                  <Image source={assets.paypal} className="w-full h-full" resizeMode="contain" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handlePaymentSelection('Cryptos')}
                  className="w-1/2 h-16 bg-white p-2 rounded-md flex items-center justify-center"
                >
                  <Image source={assets.crypto} className="w-full h-full" resizeMode="contain" />
                </TouchableOpacity>
              </View>

              {selectedPaymentMethod && selectedPaymentMethod !== 'M-Pesa' && (
                <TouchableOpacity
                  className="w-full mt-4 py-2 rounded-md bg-softPink"
                  onPress={() => debouncedCheckout()}
                >
                  <Text className="text-center text-xs md:text-base font-semibold text-white">
                    {`Buy ${selectedPackage?.credits || 0} Tokens`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <Footer />

      {/* M-Pesa Modal */}
      {showMpesaModal && (
        <View className="absolute inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center px-4">
          <View className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-sm">
            <Text className="text-lg md:text-xl font-bold mb-4 text-softPink">
              Complete M-Pesa Payment
            </Text>
            <Text className="text-gray-300 text-xs md:text-sm mb-4">
              Enter your Safaricom phone number below. First, initiate the payment to receive an STK
              push.
            </Text>
            <View className="mb-4">
              <Text className="text-gray-300 text-xs md:text-sm">Phone Number</Text>
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="e.g., 2547XXXXXXXX"
                className="w-full p-2 border rounded mt-1 text-black text-xs md:text-sm placeholder-gray-500"
              />
            </View>
            <View className="flex-row justify-end space-x-2 mb-4">
              <TouchableOpacity
                onPress={() => setShowMpesaModal(false)}
                className="px-3 py-2 bg-gray-700 rounded"
              >
                <Text className="text-xs text-gray-300">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => debouncedInitiateMpesaPayment()}
                disabled={initiatingPayment}
                className="px-3 py-2 bg-blue-600 rounded"
              >
                {initiatingPayment ? (
                  <Spinner />
                ) : (
                  <Text className="text-xs text-white">Initiate Payment</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCompletePayment}
                className="px-3 py-2 bg-green-600 rounded"
              >
                <Text className="text-xs text-white">Complete Payment</Text>
              </TouchableOpacity>
            </View>
            <View className="border-t border-gray-700 pt-4">
              <Text className="text-gray-300 text-xs md:text-sm mb-2">
                If your payment did not complete due to network issues, you can update your M-Pesa
                reference number below.
              </Text>
              <View className="mb-4">
                <Text className="text-gray-300 text-xs md:text-sm">M-Pesa Reference Number</Text>
                <TextInput
                  value={mpesaReference}
                  onChangeText={setMpesaReference}
                  placeholder="Enter reference number"
                  className="w-full p-2 border rounded mt-1 text-black text-xs md:text-sm placeholder-gray-500"
                />
              </View>
              <TouchableOpacity
                onPress={() => debouncedUpdateMpesaReference()}
                className="w-full bg-orange-600 py-2 rounded-lg"
              >
                <Text className="text-xs text-white text-center">Update Payment Reference</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default PaymentScreen;
