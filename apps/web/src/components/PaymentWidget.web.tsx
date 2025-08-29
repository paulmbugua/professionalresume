// apps/web/src/components/payment/PaymentWidget.tsx
import React, { useMemo, useEffect } from 'react';
import { assets } from '../assets/assets';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import debounce from 'lodash.debounce';
import Spinner from './Spinner.web';
import { usePayment, useHomePage } from '@mytutorapp/shared/hooks';
import usePayPalCheckout from '@mytutorapp/shared/hooks/usePayPalCheckout';

import type {
  PaymentPackage,
  UpdatedProfileData,
  ProfileData,
  MappedProfile,
  Profile as BareProfile,
  PayoutCurrency,
} from '@mytutorapp/shared/types';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  showTutorPreview?: boolean; // compact by default; can show tutor preview if desired
};

const TutorRating = ({ rating, totalReviews }: { rating: number; totalReviews: number }) => {
  const rounded = Math.round(rating * 2) / 2;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rounded >= i) stars.push(<FaStar key={i} className="text-yellow-500" />);
    else if (rounded + 0.5 === i) stars.push(<FaStarHalfAlt key={i} className="text-yellow-500" />);
    else stars.push(<FaRegStar key={i} className="text-yellow-500" />);
  }
  return (
    <div className="flex items-center">
      {stars}
      <span className="ml-2 text-xs text-gray-400">
        ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
};

/** Safely derive payout currency from any of your known profile shapes. */
function normalizeCurrency(input?: string | null): PayoutCurrency | undefined {
  if (!input) return undefined;
  const up = input.toUpperCase();
  if (up === 'USD') return 'USD';
  if (up === 'KES' || up === 'KSH' || up === 'KSHS') return 'KES';
  return undefined;
}

function getPayoutCurrency(
  p: BareProfile | UpdatedProfileData | ProfileData | MappedProfile | undefined
): PayoutCurrency | undefined {
  if (!p) return undefined;

  // camelCase (UpdatedProfileData/ProfileData)
  const camel = (p as UpdatedProfileData | ProfileData | { payoutCurrency?: string }).payoutCurrency;
  const c1 = normalizeCurrency(camel);
  if (c1) return c1;

  // snake_case (MappedProfile)
  const snake = (p as MappedProfile | { payout_currency?: string }).payout_currency;
  const c2 = normalizeCurrency(snake);
  if (c2) return c2;

  // heuristic fallback: payoutMethod mpesa => KES
  const pm =
    (p as UpdatedProfileData | ProfileData | { payoutMethod?: string }).payoutMethod ??
    (p as MappedProfile | { payout_method?: string }).payout_method;
  if (typeof pm === 'string' && pm.toLowerCase() === 'mpesa') return 'KES';

  return undefined;
}

const PaymentWidget: React.FC<Props> = ({
  isOpen,
  onClose,
  title = 'Buy Tokens',
  showTutorPreview = false,
}) => {
  // (1) Minimal search props to satisfy useHomePage (we won’t render the search UI here)
  const { loading: loadingProfiles } = useHomePage();

  // (2) Payment logic from your hook
  const {
    packages,                 // includes { id, credits, price, currency, offer }
    selectedPackage,
    handlePackageSelection,
    profile,                  // could be Profile / UpdatedProfileData / ProfileData / MappedProfile
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
    inferredCurrency,         // from your hook ('USD' | 'KES')
  } = usePayment();

  // Debounce key actions
  const debouncedCheckout = useMemo(() => debounce(handleCheckout, 300), [handleCheckout]);
  const debouncedInitiate = useMemo(
    () => debounce(handleInitiateMpesaPayment, 300),
    [handleInitiateMpesaPayment]
  );
  const debouncedUpdateRef = useMemo(
    () => debounce(handleUpdateMpesaReference, 300),
    [handleUpdateMpesaReference]
  );

  useEffect(() => {
    return () => {
      debouncedCheckout.cancel();
      debouncedInitiate.cancel();
      debouncedUpdateRef.cancel();
    };
  }, [debouncedCheckout, debouncedInitiate, debouncedUpdateRef]);

  /* -------------------------------------------------------
   * Default UX based on payout currency (no direct property access)
   * -----------------------------------------------------*/
  const payoutPref = useMemo(() => getPayoutCurrency(profile as any), [profile]);

  useEffect(() => {
    if (!isOpen) return;
    if (payoutPref === 'KES') {
      handlePaymentSelection('M-Pesa');
      setShowMpesaModal(true);
    } else {
      handlePaymentSelection('PayPal'); // USD default
      setShowMpesaModal(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, payoutPref]);

  /* -------------------------------------------------------
   * Package filtering by inferredCurrency (from hook)
   * -----------------------------------------------------*/
  const displayedPackages = useMemo<PaymentPackage[]>(() => {
    if (!Array.isArray(packages)) return [];
    return (packages as PaymentPackage[]).filter(
      (p) => (p.currency || '').toUpperCase() === inferredCurrency
    );
  }, [packages, inferredCurrency]);

  // Auto-select first package when list changes or was cleared
  useEffect(() => {
    if (!selectedPackage && displayedPackages.length) {
      handlePackageSelection(displayedPackages[0] as PaymentPackage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedPackages, selectedPackage]);

  // Pretty price label
  const formatPrice = (pkg: PaymentPackage) =>
    (pkg.currency || '').toUpperCase() === 'USD'
      ? `$ ${Number(pkg.price).toFixed(2)}`
      : `KSh ${Number(pkg.price).toLocaleString('en-KE')}`;

  /* -------------------------------------------------------
   * PayPal "Click to Pay" via shared hook (USD only)
   * -----------------------------------------------------*/
  const {
    containerRef: paypalContainerRef,
    ready: paypalReady,
    error: paypalError,
  } = usePayPalCheckout({
    packageId: selectedPackage?.id,
    amountLabel: selectedPackage ? `${selectedPackage.credits} Tokens` : undefined,
    onApproved: () => {
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden
      />

      {/* Slide-over panel */}
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-[480px] bg-white dark:bg-[#0f1821] shadow-2xl ring-1 ring-gray-200 dark:ring-darkCard
                   animate-[slideIn_.25s_ease-out] overflow-y-auto"
        style={{ animationName: 'slideIn' }}
      >
        <style>
          {`@keyframes slideIn { from { transform: translateX(16px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}
        </style>

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-gray-200 dark:border-darkCard bg-white/90 dark:bg-[#0f1821]/90 backdrop-blur">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm bg-gray-100 dark:bg-[#172534] hover:opacity-90"
          >
            Close
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Optional tutor preview for trust */}
          {showTutorPreview && (
            <div className="rounded-lg border border-gray-200 dark:border-darkCard">
              <div className="p-4">
                {loadingProfile ? (
                  <p className="text-sm text-gray-500">Loading tutor profile…</p>
                ) : profile ? (
                  <>
                    <div className="w-full aspect-[16/10] overflow-hidden rounded-lg">
                      <img
                        src={mainImage ?? undefined}
                        alt={(profile as BareProfile).name || 'Tutor'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="mt-3">
                      <p className="font-semibold">{(profile as BareProfile).name}</p>
                      <TutorRating
                        rating={ratingData.avgRating}
                        totalReviews={ratingData.totalReviews}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">No tutor profile found.</p>
                )}
              </div>
            </div>
          )}

          {/* Packages */}
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-base font-semibold">Choose your package</h4>
              <span className="text-xs rounded px-2 py-0.5 bg-gray-100 dark:bg-[#172534]">
                Showing: {inferredCurrency}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {displayedPackages.length ? (
                displayedPackages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => handlePackageSelection(pkg)}
                    className={`w-full text-left p-3 rounded-lg border transition
                                ${selectedPackage?.id === pkg.id
                                  ? 'border-pink-500 bg-pink-50 dark:bg-[#1b1d2a]'
                                  : 'border-gray-200 dark:border-darkCard hover:bg-gray-50 dark:hover:bg-[#121927]'}
                                `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{pkg.credits} Tokens</p>
                        <p className="text-xs text-gray-500">{pkg.offer}</p>
                      </div>
                      <span className="text-sm font-bold text-pink-600">
                        {formatPrice(pkg)}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No {inferredCurrency} packages available.
                </p>
              )}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="rounded-lg border border-gray-200 dark:border-darkCard p-4">
            <h4 className="text-base font-semibold">Payment method</h4>

            {/* Reordered to show PayPal first, then M-Pesa */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button
                onClick={() => handlePaymentSelection('PayPal')}
                className={`w-full h-14 bg-white dark:bg-[#0f1821] border rounded-md flex items-center justify-center
                            hover:opacity-90 transition
                            ${selectedPaymentMethod === 'PayPal' ? 'border-pink-500' : 'border-gray-200 dark:border-darkCard'}`}
              >
                <img src={assets.paypal} alt="PayPal" className="h-10 object-contain" />
              </button>

              <button
                onClick={() => handlePaymentSelection('M-Pesa')}
                className={`w-full h-14 bg-white dark:bg-[#0f1821] border rounded-md flex items-center justify-center
                            hover:opacity-90 transition
                            ${(selectedPaymentMethod === 'M-Pesa' || selectedPaymentMethod === 'MPESA') ? 'border-pink-500' : 'border-gray-200 dark:border-darkCard'}`}
              >
                <img src={assets.mpesa} alt="M-Pesa" className="h-10 object-contain" />
              </button>

              {/* -- Commented out per request --
              <button
                onClick={() => handlePaymentSelection('Visa/MasterCard')}
                className={`w-full h-14 bg-white dark:bg-[#0f1821] border rounded-md flex items-center justify-center
                            hover:opacity-90 transition
                            ${selectedPaymentMethod === 'Visa/MasterCard' ? 'border-pink-500' : 'border-gray-200 dark:border-darkCard'}`}
              >
                <img src={assets.visamaster} alt="Visa & MasterCard" className="h-10 object-contain" />
              </button>

              <button
                onClick={() => handlePaymentSelection('Cryptos')}
                className={`w-full h-14 bg-white dark:bg-[#0f1821] border rounded-md flex items-center justify-center
                            hover:opacity-90 transition
                            ${selectedPaymentMethod === 'Cryptos' ? 'border-pink-500' : 'border-gray-200 dark:border-darkCard'}`}
              >
                <img src={assets.crypto} alt="Cryptos" className="h-10 object-contain" />
              </button>
              */}
            </div>

            {/* Primary action (not used now since only PayPal & M-Pesa remain) */}
            {selectedPaymentMethod &&
              selectedPaymentMethod !== 'MPESA' &&
              selectedPaymentMethod !== 'M-Pesa' &&
              selectedPaymentMethod !== 'PayPal' && (
                <button
                  onClick={() => debouncedCheckout()}
                  disabled={!selectedPackage}
                  className="w-full mt-4 py-2 rounded-md font-semibold text-white bg-pink-500 hover:bg-pink-600 transition disabled:opacity-50"
                >
                  {`Buy ${selectedPackage?.credits || 0} Tokens`}
                </button>
            )}

            {/* M-Pesa inline panel (KES only) */}
            {(selectedPaymentMethod === 'M-Pesa' || selectedPaymentMethod === 'MPESA') && (
              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-sm">Safaricom Phone Number</span>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="2547XXXXXXXX"
                    className="w-full mt-1 p-2 border rounded outline-none focus:ring-2 focus:ring-pink-500
                               bg-white dark:bg-[#0f1821] border-gray-200 dark:border-darkCard text-sm"
                  />
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => debouncedInitiate()}
                    disabled={initiatingPayment || !selectedPackage}
                    className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
                  >
                    {initiatingPayment ? <Spinner /> : 'Initiate STK Push'}
                  </button>
                  <button
                    onClick={async () => {
                      await handleCompletePayment();
                      onClose();
                    }}
                    disabled={!selectedPackage}
                    className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-50"
                  >
                    Complete Payment
                  </button>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-darkCard">
                  <label className="block">
                    <span className="text-sm">M-Pesa Reference (if STK failed)</span>
                    <input
                      type="text"
                      value={mpesaReference}
                      onChange={(e) => setMpesaReference(e.target.value)}
                      placeholder="Enter reference"
                      className="w-full mt-1 p-2 border rounded outline-none focus:ring-2 focus:ring-pink-500
                                 bg-white dark:bg-[#0f1821] border-gray-200 dark:border-darkCard text-sm"
                    />
                  </label>
                  <button
                    onClick={() => debouncedUpdateRef()}
                    className="w-full mt-2 bg-orange-600 text-white py-2 rounded hover:bg-orange-700 text-sm"
                  >
                    Update Reference
                  </button>
                </div>
              </div>
            )}

            {/* PayPal "Click to Pay" panel (USD only) */}
            {selectedPaymentMethod === 'PayPal' && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Click to pay securely with PayPal
                  </p>
                  {selectedPackage && (
                    <span className="text-xs font-semibold px-2 py-1 rounded bg-pink-100 text-pink-700 dark:bg-[#1b1d2a]">
                      {selectedPackage.credits} Tokens
                    </span>
                  )}
                </div>

                {/* Only render PayPal button when a USD package is selected */}
                {(!selectedPackage || selectedPackage.currency.toUpperCase() !== 'USD') && (
                  <div className="mt-2 text-xs text-orange-600">
                    Please select a USD package to continue with PayPal.
                  </div>
                )}

                {(selectedPackage?.currency.toUpperCase() === 'USD') && (
                  <>
                    <div ref={paypalContainerRef} className="mt-3" />
                    {!paypalReady && !paypalError && (
                      <div className="mt-2 text-xs text-gray-500">Loading PayPal…</div>
                    )}
                    {paypalError && (
                      <div className="mt-2 text-xs text-red-500">{paypalError}</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default PaymentWidget;
