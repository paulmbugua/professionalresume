// apps/mobile/src/screens/PaymentScreen.native.tsx
import React, { useMemo, useEffect } from 'react';
import { View, Text, Image, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import type { MainStackParamList } from '../navigation/types';
import debounce from 'lodash.debounce';
import { FontAwesome } from '@expo/vector-icons';
import Spinner from '../screens/Spinner.native';
import { usePayment } from '@mytutorapp/shared/hooks';
import type { PaymentPackage } from '@mytutorapp/shared/types';
import tw from '../../tailwind';
import { assets } from '../../assets/assets';

/** Small, consistent rating row */
const TutorRating: React.FC<{ rating: number; totalReviews: number }> = ({ rating, totalReviews }) => {
  const rounded = Math.round(rating * 2) / 2;
  const stars = Array.from({ length: 5 }, (_, i) => {
    const idx = i + 1;
    if (rounded >= idx) return 'star';
    if (rounded + 0.5 === idx) return 'star-half-full';
    return 'star-o';
  }) as Array<'star' | 'star-half-full' | 'star-o'>;

  return (
    <View style={tw`flex-row items-center`}>
      {stars.map((name, i) => (
        <FontAwesome key={i} name={name} size={16} color="#FBBF24" />
      ))}
      <Text style={tw`ml-2 text-xs text-gray-300`}>
        ({totalReviews} review{totalReviews === 1 ? '' : 's'})
      </Text>
    </View>
  );
};

function normalizeCurrency(input?: string | null) {
  if (!input) return undefined;
  const up = input.toUpperCase();
  if (up === 'USD') return 'USD';
  if (up === 'KES' || up === 'KSH' || up === 'KSHS') return 'KES';
  return undefined;
}
function getPayoutCurrency(profile: any): 'USD' | 'KES' | undefined {
  if (!profile) return undefined;
  const camel = normalizeCurrency(profile?.payoutCurrency);
  if (camel) return camel;
  const snake = normalizeCurrency(profile?.payout_currency);
  if (snake) return snake;
  const pm = (profile?.payoutMethod ?? profile?.payout_method)?.toLowerCase?.();
  if (pm === 'mpesa') return 'KES';
  return undefined;
}

const PaymentScreen: React.FC = () => {
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
    initiatingPayment,
    handleInitiateMpesaPayment,
    handleCompletePayment,
    mpesaReference,
    setMpesaReference,
    handleUpdateMpesaReference,
    handleCheckout,
    inferredCurrency,
  } = usePayment();

  const debouncedCheckout = useMemo(() => debounce(handleCheckout, 300), [handleCheckout]);
  const debouncedInitiate = useMemo(() => debounce(handleInitiateMpesaPayment, 300), [handleInitiateMpesaPayment]);
  const debouncedUpdate   = useMemo(() => debounce(handleUpdateMpesaReference, 300), [handleUpdateMpesaReference]);

  useEffect(() => {
    return () => {
      debouncedCheckout.cancel();
      debouncedInitiate.cancel();
      debouncedUpdate.cancel();
    };
  }, [debouncedCheckout, debouncedInitiate, debouncedUpdate]);

  const payoutPref = useMemo(() => getPayoutCurrency(profile as any), [profile]);
  useEffect(() => {
    if (payoutPref === 'KES') handlePaymentSelection('M-Pesa');
    else handlePaymentSelection('PayPal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutPref]);

  const displayedPackages = useMemo<PaymentPackage[]>(() => {
    if (!Array.isArray(packages)) return [];
    return (packages as PaymentPackage[]).filter(
      (p) => (p.currency || '').toUpperCase() === inferredCurrency
    );
  }, [packages, inferredCurrency]);

  useEffect(() => {
    if (!selectedPackage) {
      const first = displayedPackages.at(0) ?? null;
      if (first) handlePackageSelection(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedPackages, selectedPackage]);

  const formatPrice = (pkg: PaymentPackage) =>
    (pkg.currency || '').toUpperCase() === 'USD'
      ? `$ ${Number(pkg.price).toFixed(2)}`
      : `KSh ${Number(pkg.price).toLocaleString('en-KE')}`;

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
        <Text style={tw`text-gray-200 text-center mb-4`}>{String(packagesError)}</Text>
        <TouchableOpacity onPress={handleCheckout} style={tw`px-4 py-2 bg-softPink rounded`}>
          <Text style={tw`text-white`}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const paypalEligible =
    selectedPaymentMethod === 'PayPal' &&
    !!selectedPackage &&
    (selectedPackage.currency || '').toUpperCase() === 'USD';

  return (
    <View style={tw`bg-gray-900 flex-1`}>
      <ScrollView contentContainerStyle={tw`pt-12 p-4`}>
        <Text style={tw`text-2xl font-semibold text-softPink mb-2`}>Buy Tokens</Text>
        <Text style={tw`text-center text-gray-400 text-sm mb-6`}>
          Choose a package and pay securely. Tokens let you book tutoring sessions.
        </Text>

        {profile && (
          <View style={tw`bg-gray-800 p-4 rounded-lg mb-6`}>
            <View style={tw`w-full h-40 mb-3 rounded-lg overflow-hidden`}>
              <Image
                source={mainImage ? { uri: mainImage } : assets.logo}
                style={tw`w-full h-full`}
                resizeMode="cover"
              />
            </View>
            <Text style={tw`text-lg font-semibold text-softPink`}>{(profile as any).name}</Text>
            <View style={tw`mt-2`}>
              <TutorRating
                rating={Number(ratingData?.avgRating ?? 0)}
                totalReviews={Number(ratingData?.totalReviews ?? 0)}
              />
            </View>
          </View>
        )}

        <View>
          <View style={tw`flex-row items-center justify-between mb-2`}>
            <Text style={tw`text-lg font-bold text-softPink`}>Choose your package</Text>
            <Text style={tw`text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300`}>
              Showing: {inferredCurrency}
            </Text>
          </View>

          {displayedPackages.length ? (
            displayedPackages.map((pkg) => {
              const isSelected = selectedPackage?.id === pkg.id;
              return (
                <TouchableOpacity
                  key={pkg.id}
                  onPress={() => handlePackageSelection(pkg)}
                  style={tw.style(
                    'p-4 rounded-lg mb-3',
                    isSelected ? 'border-2 border-softPink bg-gray-800' : 'border border-gray-700'
                  )}
                >
                  <View style={tw`flex-row items-center justify-between`}>
                    <View style={tw`flex-shrink`}>
                      <Text style={tw`text-white font-semibold`}>{pkg.credits} Tokens</Text>
                      <Text style={tw`text-gray-400 text-xs mt-1`}>{pkg.offer}</Text>
                    </View>
                    <Text style={tw`text-softPink font-bold`}>{formatPrice(pkg)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={tw`text-gray-400`}>No {inferredCurrency} packages available.</Text>
          )}
        </View>

        <View style={tw`mt-6 bg-gray-800 p-4 rounded-lg`}>
          <Text style={tw`text-base font-semibold text-gray-200 mb-3`}>Payment method</Text>

          <View style={tw`flex-row justify-between`}>
            <TouchableOpacity
              onPress={() => handlePaymentSelection('PayPal')}
              style={tw.style(
                'w-[48%] h-14 bg-white rounded-md items-center justify-center mb-3',
                selectedPaymentMethod === 'PayPal' ? 'border-2 border-softPink' : 'border border-gray-300'
              )}
            >
              <Image source={assets.paypal} style={tw`w-full h-full`} resizeMode="contain" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handlePaymentSelection('M-Pesa')}
              style={tw.style(
                'w-[48%] h-14 bg-white rounded-md items-center justify-center mb-3',
                (selectedPaymentMethod === 'M-Pesa' || selectedPaymentMethod === 'MPESA')
                  ? 'border-2 border-softPink'
                  : 'border border-gray-300'
              )}
            >
              <Image source={assets.mpesa} style={tw`w-full h-full`} resizeMode="contain" />
            </TouchableOpacity>
          </View>

          {selectedPaymentMethod === 'PayPal' && (
            <View style={tw`mt-2`}>
              <View style={tw`flex-row items-center justify-between`}>
                <Text style={tw`text-xs text-gray-300`}>Pay securely with PayPal</Text>
                {!!selectedPackage && (
                  <Text style={tw`text-[11px] px-2 py-1 rounded bg-gray-900 text-gray-200`}>
                    {selectedPackage.credits} Tokens
                  </Text>
                )}
              </View>

              {!paypalEligible && (
                <Text style={tw`mt-2 text-[11px] text-orange-400`}>
                  Please select a USD package to continue with PayPal.
                </Text>
              )}

              {paypalEligible && (
                <TouchableOpacity
                  onPress={() => debouncedCheckout()}
                  style={tw`mt-3 w-full py-2 rounded-md bg-softPink items-center`}
                >
                  <Text style={tw`text-white text-xs font-semibold`}>
                    Pay {formatPrice(selectedPackage!)}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {(selectedPaymentMethod === 'M-Pesa' || selectedPaymentMethod === 'MPESA') && (
            <View style={tw`mt-2`}>
              <Text style={tw`text-xs text-gray-300 mb-2`}>
                Enter your Safaricom number and initiate STK push.
              </Text>

              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="2547XXXXXXXX"
                placeholderTextColor="#6B7280"
                style={tw`w-full p-2 bg-gray-900 border border-gray-700 rounded text-white text-xs mb-2`}
              />

              <View style={tw`flex-row items-center justify-end mb-2`}>
                <TouchableOpacity
                  onPress={() => debouncedInitiate()}
                  disabled={initiatingPayment || !selectedPackage}
                  style={tw.style(
                    'px-3 py-2 rounded bg-blue-600 mr-2',
                    (!selectedPackage || initiatingPayment) && 'opacity-50'
                  )}
                >
                  {initiatingPayment ? <Spinner /> : <Text style={tw`text-xs text-white`}>Initiate STK Push</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await handleCompletePayment();
                      navigation.goBack();
                    } catch {
                      Alert.alert('Payment Error', 'Payment failed. Please try again.', [{ text: 'OK' }]);
                    }
                  }}
                  disabled={!selectedPackage}
                  style={tw.style('px-3 py-2 rounded bg-green-600', !selectedPackage && 'opacity-50')}
                >
                  <Text style={tw`text-xs text-white`}>Complete Payment</Text>
                </TouchableOpacity>
              </View>

              <Text style={tw`text-[11px] text-gray-400 mb-1`}>
                Or enter your M-Pesa reference if STK failed:
              </Text>
              <TextInput
                value={mpesaReference}
                onChangeText={setMpesaReference}
                placeholder="Enter reference"
                placeholderTextColor="#6B7280"
                style={tw`w-full p-2 bg-gray-900 border border-gray-700 rounded text-white text-xs mb-2`}
              />
              <TouchableOpacity onPress={() => debouncedUpdate()} style={tw`w-full py-2 bg-orange-600 rounded items-center`}>
                <Text style={tw`text-xs text-white`}>Update Reference</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={tw`mt-6`}>
          <Text style={tw`text-[11px] text-gray-500 text-center`}>
            By paying you agree to our Refund, Cancellation, and Fulfillment policies.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default PaymentScreen;
