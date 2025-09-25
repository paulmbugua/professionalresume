// apps/mobile/src/screens/PaymentWidget.native.tsx
import React, { useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import debounce from 'lodash.debounce';
import { FontAwesome } from '@expo/vector-icons';
import tw from '../../tailwind';
import Spinner from './Spinner.native';
import { usePayment } from '@mytutorapp/shared/hooks';
import type { PaymentPackage } from '@mytutorapp/shared/types';
import { assets } from '../../assets/assets';

type Props = {
  isOpen: boolean;
  onClose: () => Promise<void> | void;
  title?: string;
  showTutorPreview?: boolean;
};

/* ---------- tiny helpers ---------- */
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
        <FontAwesome key={i} name={name} size={14} color="#FBBF24" />
      ))}
      <Text style={tw`ml-2 text-[11px] text-gray-400`}>({totalReviews} review{totalReviews === 1 ? '' : 's'})</Text>
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

/* ---------- main widget ---------- */
const PaymentWidget: React.FC<Props> = ({ isOpen, onClose, title = 'Buy Tokens', showTutorPreview = true }) => {
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

  // debounced actions
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

  // default payment method from tutor payout pref
  const payoutPref = useMemo(() => getPayoutCurrency(profile as any), [profile]);
  useEffect(() => {
    if (payoutPref === 'KES') handlePaymentSelection('M-Pesa');
    else handlePaymentSelection('PayPal');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutPref]);

  // currency-filtered packages
  const displayedPackages = useMemo<PaymentPackage[]>(() => {
    if (!Array.isArray(packages)) return [];
    return (packages as PaymentPackage[]).filter(
      (p) => (p.currency || '').toUpperCase() === inferredCurrency
    );
  }, [packages, inferredCurrency]);

  // choose first by default
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

  const paypalEligible =
    selectedPaymentMethod === 'PayPal' &&
    !!selectedPackage &&
    (selectedPackage.currency || '').toUpperCase() === 'USD';

  const loading = loadingPackages || loadingProfile;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={tw`absolute inset-0 bg-black/60`} onPress={onClose} />

      {/* Centered & height-constrained card */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw`flex-1 items-center justify-center p-3`}
        pointerEvents="box-none"
      >
        <View
          style={tw`
            w-[92%] max-w-[520px]
            max-h-[72%]       /* ⬅️ compress height */
            rounded-2xl bg-white dark:bg-[#0f1821]
            border border-black/10 dark:border-white/10
            overflow-hidden
          `}
        >
          {/* Header (tighter) */}
          <View style={tw`px-3 pt-3 pb-2 border-b border-black/5 dark:border-white/10`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-[16px] font-bold text-darkText dark:text-white`}>{title}</Text>
              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close payment"
                style={tw`h-8 w-8 rounded-full items-center justify-center bg-softGray dark:bg-white/10`}
              >
                <Text style={tw`text-base text-darkText dark:text-white`}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Body (scrollable area with smaller paddings) */}
          {loading ? (
            <View style={tw`p-5 items-center justify-center`}>
              <Spinner />
            </View>
          ) : packagesError ? (
            <View style={tw`p-5 items-center`}>
              <Text style={tw`text-red-500 text-base mb-1.5`}>Error</Text>
              <Text style={tw`text-gray-600 dark:text-white/80 text-center mb-3`}>
                {String(packagesError)}
              </Text>
              <TouchableOpacity onPress={handleCheckout} style={tw`px-4 py-2 bg-softPink rounded`}>
                <Text style={tw`text-white font-semibold`}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={tw`flex-1`}
              contentContainerStyle={tw`p-3`}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
            >
              {/* Tutor Preview (optional, compact) */}
              {showTutorPreview && profile && (
                <View style={tw`bg-gray-100 dark:bg-[#101826] p-3 rounded-lg mb-3 border border-black/5 dark:border-white/10`}>
                  <View style={tw`w-full h-28 mb-2 rounded-lg overflow-hidden bg-gray-200 dark:bg-black/20`}>
                    <Image
                      source={mainImage ? { uri: mainImage } : assets.logo}
                      style={tw`w-full h-full`}
                      resizeMode="cover"
                    />
                  </View>
                  <Text style={tw`text-[15px] font-semibold text-softPink`} numberOfLines={1}>
                    {(profile as any).name}
                  </Text>
                  <View style={tw`mt-1`}>
                    <TutorRating
                      rating={Number((ratingData as any)?.avgRating ?? 0)}
                      totalReviews={Number((ratingData as any)?.totalReviews ?? 0)}
                    />
                  </View>
                </View>
              )}

              {/* Packages (compact spacing) */}
              <View>
                <View style={tw`flex-row items-center justify-between mb-1.5`}>
                  <Text style={tw`text-[15px] font-bold text-softPink`}>Choose your package</Text>
                  <Text style={tw`text-[10px] px-2 py-0.5 rounded bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white/80`}>
                    {inferredCurrency}
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
                          'p-3 rounded-lg mb-2',
                          isSelected ? 'border-2 border-softPink bg-gray-100 dark:bg-[#101826]'
                                     : 'border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0f1821]'
                        )}
                      >
                        <View style={tw`flex-row items-center justify-between`}>
                          <View style={tw`flex-shrink`}>
                            <Text style={tw`text-[#0d141c] dark:text-white font-semibold`}>{pkg.credits} Tokens</Text>
                            {!!pkg.offer && <Text style={tw`text-gray-600 dark:text-white/70 text-[11px] mt-0.5`}>{pkg.offer}</Text>}
                          </View>
                          <Text style={tw`text-softPink font-bold`}>{formatPrice(pkg)}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <Text style={tw`text-gray-600 dark:text-white/70`}>No {inferredCurrency} packages available.</Text>
                )}
              </View>

              {/* Payment Method (compact) */}
              <View style={tw`mt-3 bg-gray-100 dark:bg-[#101826] p-3 rounded-lg border border-black/5 dark:border-white/10`}>
                <Text style={tw`text-[15px] font-semibold text-darkText dark:text-white mb-2`}>Payment method</Text>

                <View style={tw`flex-row justify-between`}>
                  <TouchableOpacity
                    onPress={() => handlePaymentSelection('PayPal')}
                    style={tw.style(
                      'w-[48%] h-12 bg-white rounded-md items-center justify-center mb-2',
                      selectedPaymentMethod === 'PayPal' ? 'border-2 border-softPink' : 'border border-gray-300'
                    )}
                  >
                    <Image source={assets.paypal} style={tw`w-full h-full`} resizeMode="contain" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePaymentSelection('M-Pesa')}
                    style={tw.style(
                      'w-[48%] h-12 bg-white rounded-md items-center justify-center mb-2',
                      (selectedPaymentMethod === 'M-Pesa' || selectedPaymentMethod === 'MPESA')
                        ? 'border-2 border-softPink'
                        : 'border border-gray-300'
                    )}
                  >
                    <Image source={assets.mpesa} style={tw`w-full h-full`} resizeMode="contain" />
                  </TouchableOpacity>
                </View>

                {/* PayPal */}
                {selectedPaymentMethod === 'PayPal' && (
                  <View style={tw`mt-1`}>
                    <View style={tw`flex-row items-center justify-between`}>
                      <Text style={tw`text-[11px] text-gray-600 dark:text-white/70`}>Pay securely with PayPal</Text>
                      {!!selectedPackage && (
                        <Text style={tw`text-[10px] px-2 py-1 rounded bg-white dark:bg-[#0f1821] text-gray-700 dark:text-white/80`}>
                          {selectedPackage.credits} Tokens
                        </Text>
                      )}
                    </View>

                    {!paypalEligible && (
                      <Text style={tw`mt-1 text-[11px] text-orange-500`}>
                        Select a USD package to continue with PayPal.
                      </Text>
                    )}

                    {paypalEligible && (
                      <TouchableOpacity
                        onPress={() => debouncedCheckout()}
                        style={tw`mt-2 w-full py-2 rounded-md bg-softPink items-center`}
                      >
                        <Text style={tw`text-white text-xs font-semibold`}>
                          Pay {formatPrice(selectedPackage!)}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* M-Pesa */}
                {(selectedPaymentMethod === 'M-Pesa' || selectedPaymentMethod === 'MPESA') && (
                  <View style={tw`mt-1`}>
                    <Text style={tw`text-[11px] text-gray-600 dark:text-white/70 mb-1`}>
                      Enter your Safaricom number and initiate STK push.
                    </Text>

                    <TextInput
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="2547XXXXXXXX"
                      placeholderTextColor="#6B7280"
                      style={tw`w-full p-2 bg-white dark:bg-[#0f1821] border border-gray-300 dark:border-white/10 rounded text-[#0d141c] dark:text-white text-xs mb-1.5`}
                      keyboardType="phone-pad"
                    />

                    <View style={tw`flex-row items-center justify-end mb-1`}>
                      <TouchableOpacity
                        onPress={() => debouncedInitiate()}
                        disabled={initiatingPayment || !selectedPackage}
                        style={tw.style(
                          'px-3 py-2 rounded bg-blue-600 mr-2',
                          (!selectedPackage || initiatingPayment) && 'opacity-50'
                        )}
                      >
                        {initiatingPayment ? <Spinner /> : <Text style={tw`text-xs text-white`}>Initiate STK</Text>}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={async () => {
                          try {
                            await handleCompletePayment();
                            onClose?.();
                          } catch {
                            Alert.alert('Payment Error', 'Payment failed. Please try again.', [{ text: 'OK' }]);
                          }
                        }}
                        disabled={!selectedPackage}
                        style={tw.style('px-3 py-2 rounded bg-green-600', !selectedPackage && 'opacity-50')}
                      >
                        <Text style={tw`text-xs text-white`}>Complete</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={tw`text-[11px] text-gray-600 dark:text-white/70 mb-1`}>
                      Or enter your M-Pesa reference:
                    </Text>
                    <TextInput
                      value={mpesaReference}
                      onChangeText={setMpesaReference}
                      placeholder="Enter reference"
                      placeholderTextColor="#6B7280"
                      style={tw`w-full p-2 bg-white dark:bg-[#0f1821] border border-gray-300 dark:border-white/10 rounded text-[#0d141c] dark:text-white text-xs mb-1.5`}
                    />
                    <TouchableOpacity onPress={() => debouncedUpdate()} style={tw`w-full py-2 bg-orange-600 rounded items-center`}>
                      <Text style={tw`text-xs text-white`}>Update Reference</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Footer note (tight) */}
              <View style={tw`mt-2`}>
                <Text style={tw`text-[10px] text-gray-500 dark:text-white/60 text-center`}>
                  By paying you agree to our Refund, Cancellation, and Fulfillment policies.
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default PaymentWidget;
