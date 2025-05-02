// /packages/shared/hooks/usePayment.ts
import { useState, useEffect } from 'react';
import { useShopContext } from '@mytutorapp/shared/context';
import type { Profile, RatingStats, PaymentPackage } from '@mytutorapp/shared/types';
import {
  getPaymentPackages,
  getRandomProfile,
  getTutorReviews,
  initiatePayment,
  completePayment,
  updateMpesaReference,
} from '@mytutorapp/shared/api';

const usePayment = () => {
  const { token, backendUrl } = useShopContext();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [ratingData, setRatingData] = useState<RatingStats>({ avgRating: 0, totalReviews: 0 });

  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaReference, setMpesaReference] = useState('');
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [transactionReference, setTransactionReference] = useState<string | null>(
    localStorage.getItem('transactionReference') || null
  );

  // Fetch packages and a random tutor profile on mount
  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const pkgData = await getPaymentPackages(backendUrl, token);
        setPackages(pkgData);
      } catch (error) {
        console.error('Error fetching packages:', error);
      }

      try {
        const profileData = await getRandomProfile(backendUrl, token);
        if (profileData?.role === 'tutor') {
          setProfile(profileData);
          setMainImage(profileData?.gallery?.[0] || '/default-image.jpg');
        } else {
          setProfile(null);
          setMainImage('/default-image.jpg');
        }
      } catch (error) {
        console.error('Error fetching random profile:', error);
        setProfile(null);
        setMainImage('/default-image.jpg');
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchData();
  }, [backendUrl, token]);

  // Fetch tutor rating if profile exists
  useEffect(() => {
    if (profile?.role === 'tutor') {
      getTutorReviews(backendUrl, token, profile.id)
        .then((data) => setRatingData(data))
        .catch((error) => console.error('Error fetching tutor reviews:', error));
    }
  }, [profile, backendUrl, token]);

  // Handle package selection
  const handlePackageSelection = (pkg: PaymentPackage) => {
    setSelectedPackage(pkg);
  };

  // Handle payment method selection
  const handlePaymentSelection = (method: string) => {
    let backendPaymentMethod: string | null = null;
    switch (method) {
      case 'M-Pesa':
        backendPaymentMethod = 'MPESA';
        setShowMpesaModal(true);
        break;
      case 'Visa/MasterCard':
        backendPaymentMethod = 'CARD';
        break;
      case 'PayPal':
        backendPaymentMethod = 'PAYPAL';
        break;
      case 'Cryptos':
        backendPaymentMethod = 'CRYPTO';
        break;
      default:
        backendPaymentMethod = null;
    }
    setSelectedPaymentMethod(backendPaymentMethod);
  };

  // Handle M-Pesa payment initiation
  const handleInitiateMpesaPayment = async () => {
    if (!phoneNumber) {
      alert('Please enter your Safaricom phone number.');
      return;
    }
    if (!selectedPackage || !selectedPaymentMethod) {
      alert('Please select a package and payment method.');
      return;
    }

    setInitiatingPayment(true);

    const payload = {
      amount: Number(selectedPackage.price),
      packageId: selectedPackage.id,
      paymentMethod: 'MPESA',
      phone: phoneNumber,
    };

    try {
      const data = await initiatePayment(backendUrl, token, payload);
      if (data?.transactionId) {
        setTransactionReference(data.transactionId);
        localStorage.setItem('transactionReference', data.transactionId);
        alert('STK Push initiated. Please complete the payment on your phone.');
      } else if (data?.authorization_url) {
        console.log('Authorization URL:', data.authorization_url);
      } else {
        console.error('Unexpected backend response:', data);
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
    } finally {
      setInitiatingPayment(false);
    }
  };

  // Handle payment completion
  const handleCompletePayment = async () => {
    if (!transactionReference) {
      alert('No transaction reference available. Please initiate payment first.');
      return;
    }

    // Construct payload as an object, which is likely what your API expects.
    const payload = { transactionReference };

    try {
      const { data } = await completePayment(backendUrl, token, payload);
      alert(data.message);
    } catch (error) {
      console.error('Error completing payment:', error);
      alert('Failed to complete payment.');
    }
  };

  // Handle updating MPESA reference
  const handleUpdateMpesaReference = async () => {
    if (!mpesaReference) {
      alert('Please enter your M-Pesa reference number.');
      return;
    }
    if (!transactionReference) {
      alert('No transaction reference available. Please initiate payment first.');
      return;
    }

    try {
      const data = await updateMpesaReference(
        backendUrl,
        token,
        transactionReference,
        mpesaReference
      );
      alert(data.message);
    } catch (error) {
      console.error('Error updating M-Pesa reference:', error);
      alert('Failed to update payment reference.');
    }
  };

  const handleCheckout = () => {
    alert('Checkout functionality coming soon...');
  };

  return {
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
    transactionReference,
    handleInitiateMpesaPayment,
    handleCompletePayment,
    mpesaReference,
    setMpesaReference,
    handleUpdateMpesaReference,
    handleCheckout,
  };
};

export default usePayment;
