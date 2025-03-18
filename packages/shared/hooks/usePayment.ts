// /packages/shared/hooks/usePayment.ts
import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ShopContext } from '../context/ShopContext';
import { useSafeNavigate } from '../utils/navigation';
import {
  getPaymentPackages,
  getRandomProfile,
  getTutorReviews,
  initiatePayment,
  completePayment,
  updateMpesaReference,
} from '../api/paymentApi';

export const usePayment = () => {
  const { token, backendUrl, setTokenBalance } = useContext(ShopContext)!;
  const navigate = useSafeNavigate(); // Use our safe navigation hook

  const [packages, setPackages] = useState<any[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [mpesaReference, setMpesaReference] = useState('');
  const [initiatingPayment, setInitiatingPayment] = useState(false);
  const [pollingPayment, setPollingPayment] = useState(false);
  const [transactionReference, setTransactionReference] = useState<string | null>(
    localStorage.getItem("transactionReference") || null
  );
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [ratingData, setRatingData] = useState({ avgRating: 0, totalReviews: 0 });

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
    if (profile && profile.role === 'tutor') {
      getTutorReviews(backendUrl, token, profile.id)
        .then((data) => setRatingData(data))
        .catch((error) => console.error('Error fetching tutor reviews:', error));
    }
  }, [profile, backendUrl, token]);

  // Handlers
  const handlePackageSelection = (pkg: any) => {
    setSelectedPackage(pkg);
  };

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
        localStorage.setItem("transactionReference", data.transactionId);
        alert('STK Push initiated. Please complete the payment on your phone.');
      } else if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        console.error('Unexpected backend response:', data);
      }
    } catch (error) {
      console.error('Error initiating payment:', error);
    } finally {
      setInitiatingPayment(false);
    }
  };

  const handleCompletePayment = async () => {
    if (!transactionReference) {
      alert('No transaction reference available. Please initiate payment first.');
      return;
    }
    try {
      const data = await completePayment(backendUrl, token, transactionReference);
      alert(data.message);
      navigate('/settings/account'); // Navigate to the account settings page using safe navigation
    } catch (error) {
      console.error('Error completing payment:', error);
      alert('Failed to complete payment.');
    }
  };

  const handleUpdateMpesaReference = async () => {
    if (!mpesaReference) {
      alert("Please enter your M-Pesa reference number.");
      return;
    }
    if (!transactionReference) {
      alert("No transaction reference available. Please initiate payment first.");
      return;
    }
    try {
      const data = await updateMpesaReference(backendUrl, token, transactionReference, mpesaReference);
      alert(data.message);
    } catch (error) {
      console.error("Error updating M-Pesa reference:", error);
      alert("Failed to update payment reference.");
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
    pollingPayment,
    transactionReference,
    handleInitiateMpesaPayment,
    handleCompletePayment,
    mpesaReference,
    setMpesaReference,
    handleUpdateMpesaReference,
    handleCheckout,
  };
};
