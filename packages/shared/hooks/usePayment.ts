import { useState, useEffect, useCallback } from 'react'
import { useShopContext } from '@mytutorapp/shared/context'
import type { Profile, RatingStats, PaymentPackage } from '@mytutorapp/shared/types'
import {
  getPaymentPackages,
  getRandomProfile,
  getTutorReviews,
  initiatePayment,
  completePayment,
  updateMpesaReference,
} from '@mytutorapp/shared/api'

const usePayment = () => {
  const { token, backendUrl } = useShopContext()

  // Profile & review state
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ratingData, setRatingData] = useState<RatingStats>({ avgRating: 0, totalReviews: 0 })

  // Packages state
  const [packages, setPackages] = useState<PaymentPackage[]>([])
  const [loadingPackages, setLoadingPackages] = useState<boolean>(true)

  // Selected options
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null)
  const [mainImage, setMainImage] = useState<string | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [showMpesaModal, setShowMpesaModal] = useState<boolean>(false)

  // Loading & input state
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true)
  const [phoneNumber, setPhoneNumber] = useState<string>('')
  const [mpesaReference, setMpesaReference] = useState<string>('')
  const [initiatingPayment, setInitiatingPayment] = useState<boolean>(false)

  // Transaction reference
  const [transactionReference, setTransactionReference] = useState<string | null>(null)

  // Fetch packages and a random tutor when token & URL are ready
  useEffect(() => {
    if (!token || !backendUrl) return

    const fetchData = async () => {
      // Load packages
      setLoadingPackages(true)
      try {
        const pkgData = await getPaymentPackages(backendUrl, token)
        setPackages(pkgData)
      } catch (e) {
        console.error('Error fetching packages:', e)
      } finally {
        setLoadingPackages(false)
      }

      // Load random tutor profile
      setLoadingProfile(true)
      try {
        const p = await getRandomProfile(backendUrl, token)
        if (p?.role === 'tutor') {
          setProfile(p)
          setMainImage(p.gallery?.[0] ?? null)
        } else {
          setProfile(null)
          setMainImage(null)
        }
      } catch (e) {
        console.error('Error fetching random profile:', e)
        setProfile(null)
        setMainImage(null)
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchData()
  }, [backendUrl, token])

  // Fetch reviews once we have a tutor profile
  useEffect(() => {
    if (!profile?.id || !backendUrl || !token) return
    getTutorReviews(backendUrl, token, profile.id)
      .then(setRatingData)
      .catch((e) => console.error('Error fetching tutor reviews:', e))
  }, [profile?.id, backendUrl, token])

  // Handlers
  const handlePackageSelection = useCallback((pkg: PaymentPackage) => {
    setSelectedPackage(pkg)
  }, [])

  const handlePaymentSelection = useCallback(
    (method: 'M-Pesa' | 'Visa/MasterCard' | 'PayPal' | 'Cryptos') => {
      setSelectedPaymentMethod(method)
      setShowMpesaModal(method === 'M-Pesa')
    },
    []
  )

  const handleInitiateMpesaPayment = useCallback(async () => {
    if (!phoneNumber) {
      alert('Please enter your Safaricom phone number.')
      return
    }
    if (!selectedPackage) {
      alert('Please select a package first.')
      return
    }

    setInitiatingPayment(true)
    try {
      const payload = {
        amount: Number(selectedPackage.price),
        packageId: selectedPackage.id,
        paymentMethod: 'MPESA',
        phone: phoneNumber,
      }
      const data = await initiatePayment(backendUrl, token, payload)
      if (data.transactionId) {
        setTransactionReference(data.transactionId)
        alert('STK Push initiated. Please complete the payment on your phone.')
      } else {
        console.error('Unexpected response:', data)
      }
    } catch (e) {
      console.error('Error initiating payment:', e)
      alert('Failed to initiate payment.')
    } finally {
      setInitiatingPayment(false)
    }
  }, [backendUrl, token, phoneNumber, selectedPackage])

  const handleCompletePayment = useCallback(async () => {
    if (!transactionReference) {
      alert('No transaction reference. Please initiate payment first.')
      return
    }
    try {
      const { data } = await completePayment(backendUrl, token, { transactionReference })
      alert(data.message)
    } catch (e) {
      console.error('Error completing payment:', e)
      alert('Failed to complete payment.')
    }
  }, [backendUrl, token, transactionReference])

  const handleUpdateMpesaReference = useCallback(async () => {
    if (!mpesaReference) {
      alert('Please enter your M-Pesa reference number.')
      return
    }
    if (!transactionReference) {
      alert('No transaction reference. Please initiate payment first.')
      return
    }
    try {
      const data = await updateMpesaReference(
        backendUrl,
        token,
        transactionReference,
        mpesaReference
      )
      alert(data.message)
    } catch (e) {
      console.error('Error updating reference:', e)
      alert('Failed to update reference.')
    }
  }, [backendUrl, token, transactionReference, mpesaReference])

  const handleCheckout = useCallback(() => {
    alert('Checkout functionality coming soon…')
  }, [])

  return {
    packages,
    loadingPackages,
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
  }
}

export default usePayment
