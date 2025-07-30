// packages/shared/hooks/usePayment.ts

import { useState, useCallback } from 'react'
import { useShopContext } from '@mytutorapp/shared/context'
import useAppQuery from './useAppQuery'
import { useMutation } from '@tanstack/react-query'
import type { Profile, RatingStats, PaymentPackage } from '@mytutorapp/shared/types'
import {
  getPaymentPackages,
  getRandomProfile,
  getTutorReviews,
  initiatePayment,
  completePayment as apiCompletePayment,
  updateMpesaReference as apiUpdateMpesaReference,
} from '@mytutorapp/shared/api'
import type { AxiosResponse } from 'axios'

// --- Response shapes for our mutations ---
interface InitiateResponse {
  transactionId?: string
}
interface CompleteResponse {
  payment: { status: string; mpesa_reference: string }
  tokens: number
}
interface UpdateRefResponse {
  message: string
}
// ------------------------------------------

interface UsePaymentResult {
  packages: PaymentPackage[]
  loadingPackages: boolean
  packagesError: string | null

  selectedPackage: PaymentPackage | null
  handlePackageSelection: (pkg: PaymentPackage) => void

  profile: Profile | null
  mainImage: string | null
  loadingProfile: boolean

  ratingData: RatingStats
  loadingReviews: boolean

  selectedPaymentMethod: string | null
  handlePaymentSelection: (method: string) => void
  phoneNumber: string
  setPhoneNumber: (phone: string) => void
  showMpesaModal: boolean
  setShowMpesaModal: (show: boolean) => void

  initiatingPayment: boolean
  initiateError: string | null
  transactionReference: string | null
  handleInitiateMpesaPayment: () => Promise<void>

  confirmingPayment: boolean
  confirmError: string | null
  handleCompletePayment: () => Promise<void>

  updatingReference: boolean
  updateError: string | null
  mpesaReference: string
  setMpesaReference: (ref: string) => void
  handleUpdateMpesaReference: () => Promise<void>

  handleCheckout: () => void
}

const usePayment = (): UsePaymentResult => {
  const { token, backendUrl } = useShopContext()

  // 1) Packages
  const {
    data: packages = [],
    isLoading: loadingPackages,
    error: packagesErr,
  } = useAppQuery<PaymentPackage[], Error>(
    ['paymentPackages', token],
    () => getPaymentPackages(backendUrl, token),
    { enabled: Boolean(token) }
  )
  const packagesError = packagesErr?.message ?? null

  // 2) Random tutor
  const {
    data: profile = null,
    isLoading: loadingProfile,
  } = useAppQuery<Profile | null, Error>(
    ['randomProfile', token],
    async () => {
      const p = await getRandomProfile(backendUrl, token)
      return p.role === 'tutor' ? p : null
    },
    { enabled: Boolean(token) }
  )
  const mainImage = profile?.gallery?.[0] ?? null

  // 3) Reviews
  const {
    data: ratingData = { avgRating: 0, totalReviews: 0 },
    isLoading: loadingReviews,
  } = useAppQuery<RatingStats, Error>(
    ['paymentReviews', token, profile?.id],
    () => getTutorReviews(backendUrl, token, profile!.id),
    { enabled: Boolean(profile?.id && token) }
  )

  // Selection state
  const [selectedPackage, setSelectedPackage] = useState<PaymentPackage | null>(null)
  const handlePackageSelection = useCallback((pkg: PaymentPackage) => {
    setSelectedPackage(pkg)
  }, [])

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const [showMpesaModal, setShowMpesaModal] = useState(false)
  const handlePaymentSelection = useCallback((method: string) => {
    setSelectedPaymentMethod(method)
    setShowMpesaModal(method === 'M-Pesa')
  }, [])

  const [phoneNumber, setPhoneNumber] = useState('')
  const [transactionReference, setTransactionReference] = useState<string | null>(null)
  const [mpesaReference, setMpesaReference] = useState('')

  // 4) Initiate payment
  type InitiateVars = {
    amount: number
    packageId: string
    paymentMethod: string
    phone: string
  }
  const initiateMutation = useMutation<InitiateResponse, Error, InitiateVars>({
    mutationFn: (vars) =>
      initiatePayment(backendUrl, token, {
        amount: vars.amount,
        packageId: vars.packageId,
        paymentMethod: vars.paymentMethod,
        phone: vars.phone,
      }),
  })
  const {
    mutateAsync: initiateAsync,
    status: initiatingStatus,
    error: initiateErr,
  } = initiateMutation
  const initiatingPayment = initiatingStatus === 'pending'

  const handleInitiateMpesaPayment = useCallback(async () => {
    if (!selectedPackage) {
      alert('Please select a package first.')
      return
    }
    if (!phoneNumber) {
      alert('Please enter your phone number.')
      return
    }
    try {
      const data = await initiateAsync({
        amount: Number(selectedPackage.price),
        packageId: selectedPackage.id,
        paymentMethod: 'MPESA',
        phone: phoneNumber,
      })
      if (data.transactionId) {
        setTransactionReference(data.transactionId)
        alert('STK Push initiated. Complete it on your phone.')
      }
    } catch {
      alert('Failed to initiate payment.')
    }
  }, [initiateAsync, selectedPackage, phoneNumber])
  const initiateError = (initiateErr as Error)?.message ?? null

  // 5) Complete payment
  const completeMutation = useMutation<CompleteResponse, Error, string>({
    mutationFn: (txRef) =>
      apiCompletePayment(backendUrl, token, { transactionReference: txRef }).then(
        (resp: AxiosResponse<CompleteResponse>) => resp.data
      ),
  })
  const {
    mutateAsync: completeAsync,
    status: confirmingStatus,
    error: completeErr,
  } = completeMutation
  const confirmingPayment = confirmingStatus === 'pending'

  const handleCompletePayment = useCallback(async () => {
    if (!transactionReference) {
      alert('No transaction reference. Please initiate first.')
      return
    }
    try {
      const data = await completeAsync(transactionReference)
      alert(
        `Payment status: ${data.payment.status}\n` +
        `Ref: ${data.payment.mpesa_reference}\n` +
        `Tokens: ${data.tokens}`
      )
    } catch {
      alert('Failed to confirm payment.')
    }
  }, [completeAsync, transactionReference])
  const confirmError = (completeErr as Error)?.message ?? null

  // 6) Update M‑Pesa reference
  const updateMutation = useMutation<UpdateRefResponse, Error, string>({
    mutationFn: (ref) =>
      apiUpdateMpesaReference(backendUrl, token, transactionReference!, ref),
  })
  const {
    mutateAsync: updateRefAsync,
    status: updatingStatus,
    error: updateErr,
  } = updateMutation
  const updatingReference = updatingStatus === 'pending'

  const handleUpdateMpesaReference = useCallback(async () => {
    if (!mpesaReference) {
      alert('Enter M-Pesa reference.')
      return
    }
    if (!transactionReference) {
      alert('Initiate payment first.')
      return
    }
    try {
      const data = await updateRefAsync(mpesaReference)
      alert(data.message)
    } catch {
      alert('Failed to update reference.')
    }
  }, [updateRefAsync, mpesaReference, transactionReference])
  const updateError = (updateErr as Error)?.message ?? null

  // Placeholder
  const handleCheckout = useCallback(() => {
    alert('Checkout coming soon…')
  }, [])

  return {
    packages,
    loadingPackages,
    packagesError,

    selectedPackage,
    handlePackageSelection,

    profile,
    mainImage,
    loadingProfile,

    ratingData,
    loadingReviews,

    selectedPaymentMethod,
    handlePaymentSelection,
    phoneNumber,
    setPhoneNumber,
    showMpesaModal,
    setShowMpesaModal,

    initiatingPayment,
    initiateError,
    transactionReference,
    handleInitiateMpesaPayment,

    confirmingPayment,
    confirmError,
    handleCompletePayment,

    updatingReference,
    updateError,
    mpesaReference,
    setMpesaReference,
    handleUpdateMpesaReference,

    handleCheckout,
  }
}

export default usePayment
