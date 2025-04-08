import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.web';
import Footer from '../components/Footer.web';
import { assets } from "../assets/assets";
import Spinner from '../components/Spinner.web';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';
import { usePayment } from '@shared/hooks';
import debounce from 'lodash.debounce';

// Define TypeScript interfaces
interface Package {
  id: string;
  credits: number;
  offer: string;
  price: number;
}

// Inline TutorRating component
const TutorRating = ({ rating, totalReviews }: { rating: number; totalReviews: number }) => {
  const roundedRating = Math.round(rating * 2) / 2;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (roundedRating >= i) {
      stars.push(<FaStar key={i} className="text-yellow-500" />);
    } else if (roundedRating + 0.5 === i) {
      stars.push(<FaStarHalfAlt key={i} className="text-yellow-500" />);
    } else {
      stars.push(<FaRegStar key={i} className="text-yellow-500" />);
    }
  }
  return (
    <div className="flex items-center">
      {stars}
      <span className="ml-2 text-xs text-gray-200">
        ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
      </span>
    </div>
  );
};

const PaymentPage = () => {
  const navigate = useNavigate();
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

  // Debounce functions to prevent rapid re-clicks.
  const debouncedCheckout = useMemo(() => debounce(() => handleCheckout(), 300), [handleCheckout]);
  const debouncedInitiateMpesaPayment = useMemo(() => debounce(() => handleInitiateMpesaPayment(), 300), [handleInitiateMpesaPayment]);
  const debouncedUpdateMpesaReference = useMemo(() => debounce(() => handleUpdateMpesaReference(), 300), [handleUpdateMpesaReference]);

  // Cancel debounced calls on unmount.
  useEffect(() => {
    return () => {
      debouncedCheckout.cancel();
      debouncedInitiateMpesaPayment.cancel();
      debouncedUpdateMpesaReference.cancel();
    };
  }, [debouncedCheckout, debouncedInitiateMpesaPayment, debouncedUpdateMpesaReference]);

  return ( 
    <div className="bg-gray-900 text-gray-300 min-h-screen flex flex-col">
      {/* Added onSearch prop as an empty function to satisfy Navbar's required props */}
      <Navbar onSearch={() => {}} />
      <main className="flex-grow flex flex-col items-center p-4 md:p-8 lg:p-12">
        <h1 className="text-xl md:text-3xl font-light text-softPink mb-2">
          Get Session Tokens
        </h1>
        <p className="text-center max-w-2xl text-gray-400 text-sm md:text-lg mb-4">
          Select your token package first, then choose a payment method to book tutoring sessions with ease.
        </p>
        <div className="flex flex-col lg:flex-row gap-6 w-full max-w-6xl">
          {/* Tutor Display Section */}
          <div className="hidden lg:flex bg-gray-800 p-6 rounded-lg shadow-md w-full lg:w-1/2 text-center flex-col items-center">
            {loadingProfile ? (
              <p className="text-sm">Loading tutor profile...</p>
            ) : profile ? (
              <>
                <div className="w-full h-[500px] overflow-hidden mb-4">
                  <img
                    src={mainImage ?? undefined}
                    alt={profile?.name || 'Tutor'}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <p className="text-lg md:text-xl font-semibold text-softPink">
                  {profile.name}
                </p>
                <div className="max-w-4xl mx-auto mt-4 bg-gray-800 p-4 rounded-lg shadow-md">
                  <span className="font-semibold text-pink-500">Category:</span>
                  <p className="text-gray-300 mt-1 text-xs md:text-sm">
                    {profile.category || 'Not specified'}
                  </p>
                </div>
                <div className="max-w-4xl mx-auto mt-2 bg-gray-800 p-4 rounded-lg shadow-md">
                  <span className="font-semibold text-pink-500">Expertise:</span>
                  {profile.expertise?.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile.expertise.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 border border-pink-500 text-gray-300 rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-300 mt-1 text-xs">Not specified</p>
                  )}
                </div>
                <div className="max-w-4xl mx-auto mt-2 bg-gray-800 p-4 rounded-lg shadow-md">
                  <span className="font-semibold text-pink-500">Teaching Style:</span>
                  {profile.teachingStyle?.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {profile.teachingStyle.map((style, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 border border-pink-500 text-gray-300 rounded-full text-xs"
                        >
                          {style}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-300 mt-1 text-xs">Not specified</p>
                  )}
                </div>
                <div className="max-w-4xl mx-auto mt-2 bg-gray-800 p-4 rounded-lg shadow-md">
                  <span className="font-semibold text-pink-500">Rating:</span>
                  <TutorRating rating={ratingData.avgRating} totalReviews={ratingData.totalReviews} />
                </div>
              </>
            ) : (
              <p className="text-sm">No tutor profile found.</p>
            )}
          </div>

          <div className="flex flex-col gap-6 w-full lg:w-1/2">
            {/* Heading for Packages */}
            <h2 className="text-lg md:text-2xl font-bold text-softPink mb-3">
              Choose Your Package
            </h2>
            {/* Package Selection */}
            {packages.length > 0 ? (
              packages.map((pkg) => (
                <div
                  key={pkg.id}
                  onClick={() => handlePackageSelection(pkg)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors text-xs md:text-base ${
                    selectedPackage?.id === pkg.id
                      ? 'border-softPink bg-gray-700'
                      : 'border-gray-600'
                  }`}
                >
                  <h3 className="font-semibold text-gray-200">{pkg.credits} Tokens</h3>
                  <p className="text-gray-400">{pkg.offer}</p>
                  <span className="text-base font-bold text-softPink">
                    Kshs {pkg.price}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm">No packages available.</p>
            )}

            {/* Payment Method Section */}
            <div className="relative bg-gray-800 p-6 rounded-lg shadow-md">
              {!selectedPackage && (
                <div className="absolute inset-0 bg-softPink bg-opacity-50 rounded-lg flex items-center justify-center">
                  <p className="text-white font-semibold text-xs">
                    Please select a package first
                  </p>
                </div>
              )}
              <h2 className="text-lg md:text-2xl font-semibold text-gray-300 mb-3">
                Choose Your Payment Method
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handlePaymentSelection('Visa/MasterCard')}
                  className="w-full h-16 bg-white p-2 rounded-md flex items-center justify-center hover:bg-softPink transition-colors"
                >
                  <img
                    src={assets.visamaster}
                    alt="Visa and MasterCard"
                    className="w-full h-full object-contain"
                  />
                </button>
                <button
                  onClick={() => handlePaymentSelection('M-Pesa')}
                  className="w-full h-16 bg-white p-2 rounded-md flex items-center justify-center hover:bg-softPink transition-colors"
                >
                  <img
                    src={assets.mpesa}
                    alt="M-Pesa"
                    className="w-full h-full object-contain"
                  />
                </button>
                <button
                  onClick={() => handlePaymentSelection('PayPal')}
                  className="w-full h-16 bg-white p-2 rounded-md flex items-center justify-center hover:bg-softPink transition-colors"
                >
                  <img
                    src={assets.paypal}
                    alt="PayPal"
                    className="w-full h-full object-contain"
                  />
                </button>
                <button
                  onClick={() => handlePaymentSelection('Cryptos')}
                  className="w-full h-16 bg-white p-2 rounded-md flex items-center justify-center hover:bg-softPink transition-colors"
                >
                  <img
                    src={assets.crypto}
                    alt="Cryptocurrency"
                    className="w-full h-full object-contain"
                  />
                </button>
              </div>
              {selectedPaymentMethod && selectedPaymentMethod !== 'MPESA' && (
                <button
                  className="w-full mt-4 py-2 rounded-md font-semibold text-white bg-softPink hover:bg-pink-600 transition-colors text-xs md:text-base"
                  onClick={() => debouncedCheckout()}
                >
                  {`Buy ${selectedPackage?.credits || 0} Tokens`}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* M-Pesa Modal */}
      {showMpesaModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h3 className="text-lg md:text-xl font-bold mb-4 text-softPink">
              Complete M-Pesa Payment
            </h3>
            <p className="text-gray-300 text-xs md:text-sm mb-4">
              Enter your Safaricom phone number below. First, initiate the payment to receive an STK push.
            </p>
            <label className="block mb-4">
              <span className="text-gray-300 text-xs md:text-sm">Phone Number</span>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g., 2547XXXXXXXX"
                className="w-full p-2 border rounded mt-1 focus:outline-none focus:ring-2 focus:ring-softPink text-black text-xs md:text-sm placeholder-gray-500"
              />
            </label>

            <div className="flex justify-end space-x-2 mb-4">
              <button
                onClick={() => setShowMpesaModal(false)}
                className="px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => debouncedInitiateMpesaPayment()}
                disabled={initiatingPayment}
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
              >
                {initiatingPayment ? <Spinner /> : 'Initiate Payment'}
              </button>
              <button
                onClick={handleCompletePayment}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
              >
                Complete Payment
              </button>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <p className="text-gray-300 text-xs md:text-sm mb-2">
                If your payment did not complete due to network issues, you can update your M-Pesa reference number below.
              </p>
              <label className="block mb-4">
                <span className="text-gray-300 text-xs md:text-sm">M-Pesa Reference Number</span>
                <input
                  type="text"
                  value={mpesaReference}
                  onChange={(e) => setMpesaReference(e.target.value)}
                  placeholder="Enter reference number"
                  className="w-full p-2 border rounded mt-1 focus:outline-none focus:ring-2 focus:ring-softPink text-black text-xs md:text-sm placeholder-gray-500"
                />
              </label>
              <button
                onClick={() => debouncedUpdateMpesaReference()}
                className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 transition-all duration-200 text-xs md:text-base"
              >
                Update Payment Reference
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
