// packages/shared/hooks/useManageProfileForm.ts
import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import type {
  UpdatedProfileData,
  AvailableProfile,
  MappedProfile,
  GalleryImage,
  UpdateProfilePayload,
  PayoutCurrency,
  PayoutMethod,
} from '@mytutorapp/shared/types'
import {
  fetchMyProfile,
  fetchAvailableProfiles,
  updateProfile as apiUpdateProfile,
  deleteGalleryImage as apiDeleteGalleryImage,
  deleteVideo as apiDeleteVideo,
} from '@mytutorapp/shared/api'
import { uploadAsset } from '@mytutorapp/shared/api/uploadAsset'
import { useShopContext } from '@mytutorapp/shared/context'
import useAppQuery from '@mytutorapp/shared/hooks/useAppQuery'

const short = (s?: string | null) => (s ? `${s.slice(0, 12)}…` : '—')

function extractValue(
  input:
    | string
    | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
): string {
  return typeof input === 'string' ? input : (input.target as { value: string }).value
}

const MPESA_REGEX = /^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/

const initialProfileData: UpdatedProfileData = {
  name: '',
  age: 0,
  bio: '',
  expertise: [],
  teachingStyle: [],
  status: 'Offline',
  notifications: false,
  gallery: [null, null, null, null],
  video: '',
  languages: {
    English: false,
    Swahili: false,
    French: false,
    Spanish: false,
    German: false,
  },
  pricing: { privateSession: 0, groupSession: 0, lecture: 0, workshop: 0 },
  experienceLevel: '',
  ageGroup: [],
  category: '',
  recommended: [],
  paymentMethod: 'bank',
  bankAccount: '',
  bankCode: '',
  mpesaPhoneNumber: '',

  // payout defaults
  payoutCurrency: 'KES',
  payoutMethod: 'mpesa',
  stripeConnectId: '',
  paypalEmail: '',
}

const useManageProfileForm = (navigate: (path: string) => void) => {
  const { token, backendUrl, refreshProfile } = useShopContext()
  const queryClient = useQueryClient()

  const {
    data: rawProfileResponse,
    isLoading: isProfileLoading,
    error: profileError,
  } = useAppQuery<{ profileExists: boolean; profile: any }, Error>(
    ['myProfile', token],
    () => fetchMyProfile(backendUrl!, token!),
    { enabled: Boolean(token) }
  )

  const {
    data: availableProfiles = [],
    isLoading: isAvailableLoading,
    error: availableError,
  } = useAppQuery<AvailableProfile[], Error>(
    ['availableProfiles', token],
    () => fetchAvailableProfiles(backendUrl!, token!).then((r) => r.profiles),
    { enabled: Boolean(token) }
  )

  const [role, setRole] = useState<'tutor' | 'student' | ''>('')
  const [profile, setProfile] = useState<MappedProfile | null>(null)
  const [initialData, setInitialData] = useState<UpdatedProfileData | null>(null)
  const [updatedData, setUpdatedData] = useState<UpdatedProfileData>(initialProfileData)
  const [searchResults, setSearchResults] = useState<AvailableProfile[]>([])

  useEffect(() => {
    if (!token) {
      toast.error('Please log in to manage your profile.')
      navigate('/login')
    }
  }, [token, navigate])

  useEffect(() => {
    if (!rawProfileResponse || !rawProfileResponse.profileExists) return
    const raw = rawProfileResponse.profile
    const galleryArray = Array.isArray(raw.gallery) ? raw.gallery : []
    const normalizedStatus = raw.status === 'Free Session' ? 'Free' : raw.status
    const gallery: GalleryImage[] = galleryArray.slice(0, 4).concat(Array(4 - galleryArray.length).fill(null))

    const {
      age_group,
      payment_method,
      bank_account,
      bank_code,
      mpesa_phone_number,
      experience_level,
      recommended,
      pricing,
      description,
      payout_currency,
      payout_method,
      stripe_connect_id,
      paypal_email,
      ...rest
    } = raw

    setRole(raw.role)
    setProfile(rest as MappedProfile)

    const languages: Record<string, boolean> = {
      English: false,
      Swahili: false,
      French: false,
      Spanish: false,
      German: false,
    }
    if (Array.isArray(raw.languages)) {
      raw.languages.forEach((lang: string) => {
        if (lang in languages) languages[lang] = true
      })
    }

    const resolvedPayoutCurrency = ((payout_currency as PayoutCurrency) || 'KES') as PayoutCurrency
    const resolvedPayoutMethod =
      ((payout_method as PayoutMethod) ||
        (resolvedPayoutCurrency === 'USD' ? 'stripe' : 'mpesa')) as PayoutMethod

    const finalData: UpdatedProfileData = {
      ...initialProfileData,
      ...rest,
      gallery,
      status: normalizedStatus,
      video: raw.video || '',
      languages,
      pricing: pricing || initialProfileData.pricing,
      experienceLevel: experience_level || '',
      teachingStyle: description?.teachingStyle || [],
      ageGroup: age_group || [],
      bio: description?.bio || '',
      expertise: description?.expertise || [],
      category: raw.category || '',
      recommended: recommended || [],
      paymentMethod: payment_method || 'bank',
      bankAccount: bank_account || '',
      bankCode: bank_code || '',
      mpesaPhoneNumber: mpesa_phone_number || '',

      payoutCurrency: resolvedPayoutCurrency,
      payoutMethod: resolvedPayoutMethod,
      stripeConnectId: stripe_connect_id || '',
      paypalEmail: paypal_email || '',
    }

    setInitialData(finalData)
    setUpdatedData(finalData)
  }, [rawProfileResponse])

  useEffect(() => {
    if (profileError) toast.error('Failed to load profile.')
    if (availableError) toast.error('Failed to load profiles.')
  }, [profileError, availableError])

  const isDataChanged = (a: UpdatedProfileData, b: UpdatedProfileData | null) =>
    JSON.stringify(a) !== JSON.stringify(b)

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!initialData) throw new Error('No initial data')

      // friendly validation
      if (role === 'tutor') {
        if (updatedData.payoutCurrency === 'KES') {
          if (!updatedData.mpesaPhoneNumber || !MPESA_REGEX.test(updatedData.mpesaPhoneNumber)) {
            throw new Error('Valid M-Pesa phone number is required for KES payouts.')
          }
        } else if (updatedData.payoutCurrency === 'USD') {
          if (updatedData.payoutMethod === 'stripe' && !updatedData.stripeConnectId.trim()) {
            throw new Error('Stripe Connect ID is required for USD payouts via Stripe.')
          }
          if (updatedData.payoutMethod === 'paypal' && !updatedData.paypalEmail.trim()) {
            throw new Error('PayPal email is required for USD payouts via PayPal.')
          }
          if (updatedData.payoutMethod === 'mpesa') {
            throw new Error('For USD payouts, choose Stripe or PayPal.')
          }
        }
      }

      // --- uploads ----------------------------------------------------
      console.debug('🧩 useManageProfileForm → starting upload prep', {
        hasToken: !!token,
        backendUrl,
        gallerySlots: updatedData.gallery.length,
        hasVideoFile: updatedData.video instanceof File,
        hasVideoUrl: typeof updatedData.video === 'string' && !!updatedData.video,
      })

      const rawGalleryResults = await Promise.all(
        updatedData.gallery.map(async (img, idx) => {
          if (!img) return null
          if (typeof img === 'string') {
            if (img.startsWith('http://') || img.startsWith('https://')) {
              console.debug(`📸 gallery[${idx}] kept as URL`, img)
              return img
            }
            console.debug(`⬆️ gallery[${idx}] uploading dataURL/string…`)
            return uploadAsset(backendUrl!, token!, img, 'image')
          }
          console.debug(`⬆️ gallery[${idx}] uploading File(name=${img.name})…`)
          return uploadAsset(backendUrl!, token!, img, 'image')
        })
      )
      const finalGallery = rawGalleryResults.filter((u): u is string => !!u)
      console.debug('📦 gallery upload done → count:', finalGallery.length)

      let finalVideo: string | undefined = undefined
      if (updatedData.video instanceof File) {
        console.debug('🎬 uploading video File(name=', updatedData.video.name, ')…')
        finalVideo = await uploadAsset(backendUrl!, token!, updatedData.video, 'video')
      } else if (typeof updatedData.video === 'string' && updatedData.video) {
        console.debug('🎬 keeping existing video URL')
        finalVideo = updatedData.video
      }

      // --- payload ----------------------------------------------------
      const payload: UpdateProfilePayload = {
        name: updatedData.name ?? '',
        age: updatedData.age ?? 0,
        languages: Object.keys(updatedData.languages).filter(
          (l) => updatedData.languages[l as keyof typeof updatedData.languages]
        ),
        ageGroup: updatedData.ageGroup,
        gallery: finalGallery,
        video: finalVideo,
        pricing: updatedData.pricing,
        recommended: updatedData.recommended,

        ...(role === 'tutor' && {
          status: updatedData.status,
          notifications: updatedData.notifications,
          experienceLevel: updatedData.experienceLevel,
          category: updatedData.category,

          // legacy/general
          paymentMethod: updatedData.paymentMethod,
          bankAccount: updatedData.paymentMethod === 'bank' ? updatedData.bankAccount : undefined,
          bankCode: updatedData.paymentMethod === 'bank' ? updatedData.bankCode : undefined,

          // payout prefs
          payoutCurrency: updatedData.payoutCurrency,
          payoutMethod: updatedData.payoutCurrency === 'USD' ? updatedData.payoutMethod : 'mpesa',
          mpesaPhoneNumber: updatedData.payoutCurrency === 'KES' ? updatedData.mpesaPhoneNumber : undefined,
          stripeConnectId:
            updatedData.payoutCurrency === 'USD' && updatedData.payoutMethod === 'stripe'
              ? updatedData.stripeConnectId.trim()
              : undefined,
          paypalEmail:
            updatedData.payoutCurrency === 'USD' && updatedData.payoutMethod === 'paypal'
              ? updatedData.paypalEmail.trim()
              : undefined,

          description: {
            bio: updatedData.bio ?? '',
            expertise: updatedData.expertise,
            teachingStyle: updatedData.teachingStyle,
          },
        }),
      }

      // 🔎 DEBUG: show destination + safe token + payload preview
      console.debug('🔗 useManageProfileForm → backendUrl:', backendUrl)
      console.debug('🔐 useManageProfileForm → token(short):', short(token))
      console.debug('📤 useManageProfileForm → payload being sent:', JSON.stringify(payload, null, 2))
      console.debug('🛠 useManageProfileForm → updateProfile request', {
        backendUrl,
        tokenShort: token ? `${token.slice(0, 12)}…` : '—',
        payload,
      })

      const res = await apiUpdateProfile(backendUrl!, token!, payload)

      console.debug('📥 useManageProfileForm → response status:', res?.status)
      try {
        console.debug('📥 useManageProfileForm → response data keys:', Object.keys(res?.data ?? {}))
      } catch {}

      if (res.status !== 200) throw new Error('Failed to update profile')
      return res.data
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!')
      setInitialData(updatedData)
      refreshProfile?.()
      // ensure profile cache is fresh, then navigate back
      queryClient.invalidateQueries({ queryKey: ['myProfile', token] })
      navigate('/profile/me') // ✅ Option A: go back to profile page
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to update profile.'
      console.error('❌ useManageProfileForm → API error:', {
        status: err?.response?.status,
        data: err?.response?.data,
      })
      toast.error(msg)
    },
  })

  // Handlers
  const handleInputChange = (
    field: keyof UpdatedProfileData,
    input: string | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const value = extractValue(input)
    setUpdatedData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSearch = (input: string | React.ChangeEvent<HTMLInputElement>) => {
    const term = extractValue(input).toLowerCase()
    setSearchResults(availableProfiles.filter((p) => p.name.toLowerCase().includes(term)))
  }

  const handlePricingChange = (
    field: keyof UpdatedProfileData['pricing'],
    input: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(extractValue(input))
    setUpdatedData((prev) => ({ ...prev, pricing: { ...prev.pricing, [field]: value } }))
  }

  const handlePaymentMethodChange = (input: React.ChangeEvent<HTMLSelectElement>) => {
    const value = extractValue(input) as 'bank' | 'mpesa'
    setUpdatedData((prev) => ({
      ...prev,
      paymentMethod: value,
      bankAccount: value === 'bank' ? prev.bankAccount : '',
      bankCode: value === 'bank' ? prev.bankCode : '',
      mpesaPhoneNumber: value === 'mpesa' ? prev.mpesaPhoneNumber : '',
    }))
  }

  const handlePaymentDetailsChange = (
    field: 'bankAccount' | 'bankCode' | 'mpesaPhoneNumber',
    input: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = extractValue(input)
    setUpdatedData((prev) => ({ ...prev, [field]: value }))
  }

  // payout handlers
  const handlePayoutCurrencyChange = (input: React.ChangeEvent<HTMLSelectElement>) => {
    const value = extractValue(input) as PayoutCurrency
    setUpdatedData((prev) => {
      if (value === 'KES') {
        return {
          ...prev,
          payoutCurrency: 'KES',
          payoutMethod: 'mpesa',
          stripeConnectId: '',
          paypalEmail: '',
        }
      }
      const nextMethod: PayoutMethod =
        prev.payoutMethod === 'stripe' || prev.payoutMethod === 'paypal' ? prev.payoutMethod : 'stripe'
      return { ...prev, payoutCurrency: 'USD', payoutMethod: nextMethod }
    })
  }

  const handlePayoutMethodChange = (input: React.ChangeEvent<HTMLSelectElement>) => {
    const value = extractValue(input) as PayoutMethod
    setUpdatedData((prev) => {
      if (prev.payoutCurrency === 'KES') {
        return { ...prev, payoutCurrency: 'KES', payoutMethod: 'mpesa' }
      }
      // USD only – force valid value
      const next: PayoutMethod = value === 'stripe' || value === 'paypal' ? value : 'stripe'
      return {
        ...prev,
        payoutMethod: next,
        ...(next === 'stripe' ? { paypalEmail: '' } : {}),
        ...(next === 'paypal' ? { stripeConnectId: '' } : {}),
      }
    })
  }

  const handleLanguageSelect = (language: string) => {
    setUpdatedData((prev) => ({
      ...prev,
      languages: { ...prev.languages, [language]: !prev.languages[language] },
    }))
  }

  const handleAddRecommendation = (id: string) => {
    setUpdatedData((prev) => ({ ...prev, recommended: [...prev.recommended, id] }))
  }

  const handleRemoveRecommendation = (id: string) => {
    setUpdatedData((prev) => ({
      ...prev,
      recommended: prev.recommended.filter((pid) => pid !== id),
    }))
  }

  const handleAgeGroupSelect = (group: string) => {
    setUpdatedData((prev) => ({
      ...prev,
      ageGroup: prev.ageGroup.includes(group)
        ? prev.ageGroup.filter((g) => g !== group)
        : [...prev.ageGroup, group],
    }))
  }

  const handleTeachingStyleSelect = (style: string) => {
    setUpdatedData((prev) => ({
      ...prev,
      teachingStyle: prev.teachingStyle.includes(style)
        ? prev.teachingStyle.filter((s) => s !== style)
        : [...prev.teachingStyle, style],
    }))
  }

  const handleExpertiseSelect = (opt: string) => {
    setUpdatedData((prev) => ({
      ...prev,
      expertise: prev.expertise.includes(opt)
        ? prev.expertise.filter((e) => e !== opt)
        : [...prev.expertise, opt],
    }))
  }

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    type: 'image' | 'video' = 'image'
  ) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return

    if (type === 'image') {
      setUpdatedData((prev) => {
        const g = [...prev.gallery]
        g[index] = file
        return { ...prev, gallery: g }
      })
    } else {
      const url = URL.createObjectURL(file)
      const tmp = document.createElement('video')
      tmp.preload = 'metadata'
      tmp.onloadedmetadata = () => {
        URL.revokeObjectURL(tmp.src)
        if (tmp.duration > 30) {
          toast.error(`Video too long (${tmp.duration.toFixed(1)}s). Must be ≤30s.`)
        } else {
          setUpdatedData((prev) => ({ ...prev, video: file }))
        }
      }
      tmp.src = url
    }
  }

  const handleDeleteImage = (index: number) => {
    if (!profile?.id) return
    const url = updatedData.gallery[index]
    if (typeof url !== 'string') return
    apiDeleteGalleryImage(backendUrl!, token!, profile.id, url)
      .then(() => {
        setUpdatedData((prev) => {
          const g = [...prev.gallery]
          g[index] = null
          return { ...prev, gallery: g }
        })
        toast.success('Image deleted successfully.')
      })
      .catch(() => toast.error('Failed to delete image.'))
  }

  const handleDeleteVideo = () => {
    if (!profile?.id || typeof updatedData.video !== 'string') return
    apiDeleteVideo(backendUrl!, token!, profile.id, updatedData.video)
      .then(() => {
        setUpdatedData((prev) => ({ ...prev, video: '' }))
        toast.success('Video deleted successfully.')
      })
      .catch(() => toast.error('Failed to delete video.'))
  }

  const handleToggleNotifications = () => {
    setUpdatedData((prev) => ({ ...prev, notifications: !prev.notifications }))
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!isDataChanged(updatedData, initialData)) {
      toast.info('No changes detected')
      return
    }
    updateMutation.mutate()
  }

  return {
    role,
    updatedData,
    setUpdatedData,
    availableProfiles,
    searchResults,

    // helpful flags for UI
    isProfileLoading,
    isAvailableLoading,
    isUploading: updateMutation.isPending,

    handleInputChange,
    handleExpertiseSelect,
    handleLanguageSelect,
    handleSearch,
    handleAddRecommendation,
    handleRemoveRecommendation,
    handlePricingChange,
    handleFileChange,
    handleDeleteImage,
    handleDeleteVideo,
    handleToggleNotifications,
    handlePaymentMethodChange,
    handlePaymentDetailsChange,
    handleAgeGroupSelect,
    handleTeachingStyleSelect,

    handlePayoutCurrencyChange,
    handlePayoutMethodChange,

    handleSubmit,
  }
}

export default useManageProfileForm
