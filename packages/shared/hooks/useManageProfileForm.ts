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
  PayoutCurrency, // 'USD' | 'KES'
  PayoutMethod,   // 'wise' | 'mpesa'
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
const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

function extractValue(
  input:
    | string
    | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
): string {
  return typeof input === 'string' ? input : (input.target as { value: string }).value
}

const MPESA_REGEX = /^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ✅ New initial profile data with Wise/M-Pesa only
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

  // Legacy "paymentMethod/bank" removed
  mpesaPhoneNumber: '',
  wiseEmail: '',

  // Payout defaults → Wise (USD)
  payoutCurrency: 'USD',
  payoutMethod: 'wise',
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
      // removed legacy:
      // payment_method, bank_account, bank_code,
      mpesa_phone_number,
      wise_email,
      experience_level,
      recommended,
      pricing,
      description,
      payout_currency,
      payout_method,
      // removed legacy:
      // stripe_connect_id, paypal_email,
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

    // Derive/normalize payout
    const resolvedMethod = ((payout_method as PayoutMethod) ||
      (mpesa_phone_number ? 'mpesa' : 'wise')) as PayoutMethod
    const resolvedCurrency: PayoutCurrency =
      (payout_currency as PayoutCurrency) ||
      (resolvedMethod === 'mpesa' ? 'KES' : 'USD')

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

      // Payouts (Wise/M-Pesa only)
      payoutCurrency: resolvedCurrency,
      payoutMethod: resolvedMethod,
      mpesaPhoneNumber: mpesa_phone_number || '',
      wiseEmail: wise_email || raw.wiseEmail || '',
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

      // Friendly payout validation for tutors
      if (role === 'tutor') {
        if (updatedData.payoutMethod === 'mpesa') {
          if (!updatedData.mpesaPhoneNumber || !MPESA_REGEX.test(updatedData.mpesaPhoneNumber)) {
            throw new Error('Valid M-Pesa phone number is required for KES payouts.')
          }
        } else if (updatedData.payoutMethod === 'wise') {
          if (!updatedData.wiseEmail || !EMAIL_REGEX.test(updatedData.wiseEmail)) {
            throw new Error('A valid Wise account email is required for USD payouts.')
          }
        } else {
          throw new Error('Choose Wise or M-Pesa as your payout method.')
        }
      }

      // --- uploads ----------------------------------------------------
      if (isDev) {
        console.debug('🧩 useManageProfileForm → starting upload prep', {
          hasToken: !!token,
          backendUrl,
          gallerySlots: updatedData.gallery.length,
          hasVideoFile: updatedData.video instanceof File,
          hasVideoUrl: typeof updatedData.video === 'string' && !!updatedData.video,
        })
      }

      const rawGalleryResults = await Promise.all(
        updatedData.gallery.map(async (img, idx) => {
          if (!img) return null
          if (typeof img === 'string') {
            if (img.startsWith('http://') || img.startsWith('https://')) {
              if (isDev) console.debug(`📸 gallery[${idx}] kept as URL`, img)
              return img
            }
            if (isDev) console.debug(`⬆️ gallery[${idx}] uploading dataURL/string…`)
            return uploadAsset(backendUrl!, token!, img, 'image')
          }
          if (isDev) console.debug(`⬆️ gallery[${idx}] uploading File(name=${img.name})…`)
          return uploadAsset(backendUrl!, token!, img, 'image')
        })
      )
      const finalGallery = rawGalleryResults.filter((u): u is string => !!u)
      if (isDev) console.debug('📦 gallery upload done → count:', finalGallery.length)

      // Prefer undefined (not null) when no video
      let finalVideo: string | undefined
      if (updatedData.video instanceof File) {
        if (isDev) console.debug('🎬 uploading video File(name=', updatedData.video.name, ')…')
        finalVideo = await uploadAsset(backendUrl!, token!, updatedData.video, 'video')
      } else if (typeof updatedData.video === 'string' && updatedData.video) {
        if (isDev) console.debug('🎬 keeping existing video URL')
        finalVideo = updatedData.video
      } else {
        finalVideo = undefined
      }

      // --- payload ----------------------------------------------------
      const computedCurrency: PayoutCurrency =
        updatedData.payoutMethod === 'mpesa' ? 'KES' : 'USD'

      const payload: UpdateProfilePayload = {
        name: updatedData.name ?? '',
        age: updatedData.age > 0 ? String(updatedData.age) : '',
        languages: Object.keys(updatedData.languages).filter(
          (l) => updatedData.languages[l as keyof typeof updatedData.languages]
        ),
        ageGroup: updatedData.ageGroup,

        // Pricing / recommendations
        pricing: updatedData.pricing,
        recommended: updatedData.recommended,

        // Tutor-only fields
        ...(role === 'tutor'
          ? {
              gallery: finalGallery,
              video: finalVideo,

              status: updatedData.status,
              notifications: updatedData.notifications,
              experienceLevel: updatedData.experienceLevel,
              category: updatedData.category,

              // Payouts (Wise/M-Pesa)
              payoutCurrency: computedCurrency,
              payoutMethod: updatedData.payoutMethod,
              mpesaPhoneNumber:
                updatedData.payoutMethod === 'mpesa' ? updatedData.mpesaPhoneNumber : undefined,
              wiseEmail:
                updatedData.payoutMethod === 'wise' ? updatedData.wiseEmail?.trim() : undefined,

              // Description
              description: {
                bio: updatedData.bio ?? '',
                expertise: updatedData.expertise,
                teachingStyle: updatedData.teachingStyle,
              },
            }
          : {}),
      }

      // 🔎 DEBUG (dev only)
      if (isDev) {
        console.debug('🔗 useManageProfileForm → backendUrl:', backendUrl)
        console.debug('🔐 useManageProfileForm → token(short):', short(token))
        console.debug('📤 useManageProfileForm → payload being sent:', JSON.stringify(payload, null, 2))
        console.debug('🛠 useManageProfileForm → updateProfile request', {
          backendUrl,
          tokenShort: token ? `${token.slice(0, 12)}…` : '—',
          payload,
        })
      }

      const res = await apiUpdateProfile(backendUrl!, token!, payload)

      if (isDev) {
        console.debug('📥 useManageProfileForm → response status:', res?.status)
        try {
          console.debug('📥 useManageProfileForm → response data keys:', Object.keys(res?.data ?? {}))
        } catch {}
      }

      if (res.status !== 200) throw new Error('Failed to update profile')
      return res.data
    },
    onSuccess: async (data: any) => {
      const serverMsg =
        (data && (data.message || data.msg)) || 'Profile updated successfully!'
      toast.success(serverMsg)

      setInitialData(updatedData)
      refreshProfile?.()

      // ensure profile cache is fresh before navigating
      await queryClient.invalidateQueries({ queryKey: ['myProfile', token] })
      await queryClient.refetchQueries({ queryKey: ['myProfile', token] })

      navigate('/profile/me')
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to update profile.'
      if (isDev) {
        console.error('❌ useManageProfileForm → API error:', {
          status: err?.response?.status,
          data: err?.response?.data,
        })
      }
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
    handleAgeGroupSelect,
    handleTeachingStyleSelect,

    // (Currency is derived from method now; UI can just set payoutMethod and we map the currency internally)
    handleSubmit,
  }
}

export default useManageProfileForm
