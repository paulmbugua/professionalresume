// packages/shared/hooks/useManageProfileForm.ts

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import type {
  UpdatedProfileData,
  AvailableProfile,
  MappedProfile,
  GalleryImage,
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

// Helper to extract a value from either a string or a change event
function extractValue(
  input:
    | string
    | React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
): string {
  return typeof input === 'string'
    ? input
    : (input.target as { value: string }).value
}

// Initial empty state
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
}

const useManageProfileForm = (navigate: (path: string) => void) => {
  const { token, backendUrl, refreshProfile } = useShopContext()
  const queryClient = useQueryClient()

  // ─── Simplified API payload type ─────────────────────────────────────────────
  interface ApiPayload {
    name: string
    age: number
    languages: string[]
    ageGroup: string[]
    gallery: string[]
    video?: string
    status?: string
    notifications?: boolean
    pricing: UpdatedProfileData['pricing']
    experienceLevel?: string
    category?: string
    recommended: string[]
    paymentMethod?: 'bank' | 'mpesa'
    bankAccount?: string
    bankCode?: string
    mpesaPhoneNumber?: string
    description?: {
      bio: string
      expertise: string[]
      teachingStyle: string[]
    }
  }

  // ─── Local state ─────────────────────────────────────────────────────────────
  const [role, setRole] = useState<'tutor' | 'student' | ''>('')
  const [profile, setProfile] = useState<MappedProfile | null>(null)
  const [initialData, setInitialData] = useState<UpdatedProfileData | null>(
    null
  )
  const [updatedData, setUpdatedData] = useState<UpdatedProfileData>(
    initialProfileData
  )
  const [searchResults, setSearchResults] = useState<AvailableProfile[]>([])

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      toast.error('Please log in to manage your profile.')
      navigate('/login')
    }
  }, [token, navigate])

  // ─── fetchMyProfile ────────────────────────────────────────────────────────────
  const {
    data: rawProfileResponse,
    isLoading: isProfileLoading,
    error: profileError,
  } = useQuery<{ profileExists: boolean; profile: any }, Error>({
    queryKey: ['myProfile', token],
    queryFn: () => fetchMyProfile(backendUrl!, token!),
    enabled: Boolean(token),
  })

  // ─── fetchAvailableProfiles ─────────────────────────────────────────────────────
  const {
    data: availableProfiles = [],
    isLoading: isAvailableLoading,
    error: availableError,
  } = useQuery<AvailableProfile[], Error>({
    queryKey: ['availableProfiles', token],
    queryFn: () =>
      fetchAvailableProfiles(backendUrl!, token!).then((r) => r.profiles),
    enabled: Boolean(token),
  })

  // map rawProfileResponse into form state
  useEffect(() => {
    if (!rawProfileResponse || !rawProfileResponse.profileExists) return
    const raw = rawProfileResponse.profile
    const galleryArray = Array.isArray(raw.gallery) ? raw.gallery : []
    const normalizedStatus =
      raw.status === 'Free Session' ? 'Free' : raw.status
    const gallery: GalleryImage[] = galleryArray
      .slice(0, 4)
      .concat(Array(4 - galleryArray.length).fill(null))

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
    }

    setInitialData(finalData)
    setUpdatedData(finalData)
  }, [rawProfileResponse])

  // toast on errors
  useEffect(() => {
    if (profileError) toast.error('Failed to load profile.')
    if (availableError) toast.error('Failed to load profiles.')
  }, [profileError, availableError])

  const isDataChanged = (
    newData: UpdatedProfileData,
    orig: UpdatedProfileData | null
  ) => JSON.stringify(newData) !== JSON.stringify(orig)

  // ─── React Query: updateProfile mutation ────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!initialData) throw new Error('No initial data')

        // ─── upload images ───────────────────────────────────────────────────────
// ─── upload images ────────────────────────────────────────────────────
const rawGalleryResults = await Promise.all(
  updatedData.gallery.map(async (img) => {
    if (!img) return null

    // if it's a string…
    if (typeof img === 'string') {
      // HTTP(S) URLs: leave untouched
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img
      }
      // anything else (data:… or file://…) upload it
      return uploadAsset(backendUrl!, token!, img, 'image')
    }

    // otherwise it's a File → upload it
    return uploadAsset(backendUrl!, token!, img, 'image')
  })
)
const finalGallery = rawGalleryResults.filter((u): u is string => !!u)

console.log('📤 finalGallery payload:', finalGallery)

      // ─── upload video (unchanged) ───────────────────────────────────────────
      let finalVideo: string | undefined = undefined
      if (updatedData.video instanceof File) {
        finalVideo = await uploadAsset(
          backendUrl!,
          token!,
          updatedData.video,
          'video'
        )
      } else if (typeof updatedData.video === 'string' && updatedData.video) {
        finalVideo = updatedData.video
      }

      // ─── build payload ──────────────────────────────────────────────────────
      const payload: ApiPayload = {
        name:        updatedData.name ?? '',
        age:         updatedData.age ?? 0,
        languages:   Object.keys(updatedData.languages).filter(
                       (l) => updatedData.languages[l as keyof typeof updatedData.languages]
                     ),
        ageGroup:    updatedData.ageGroup ?? [],
        gallery:     finalGallery,
        video:       finalVideo,
        pricing:     updatedData.pricing,
        recommended: updatedData.recommended ?? [],

        ...(role === 'tutor' && {
          status:           updatedData.status,
          notifications:    updatedData.notifications,
          experienceLevel:  updatedData.experienceLevel ?? '',
          category:         updatedData.category ?? '',
          paymentMethod:    updatedData.paymentMethod,
          bankAccount:
            updatedData.paymentMethod === 'bank'
              ? updatedData.bankAccount
              : undefined,
          bankCode:
            updatedData.paymentMethod === 'bank'
              ? updatedData.bankCode
              : undefined,
          mpesaPhoneNumber:
            updatedData.paymentMethod === 'mpesa'
              ? updatedData.mpesaPhoneNumber
              : undefined,
          description: {
            bio:           updatedData.bio ?? '',
            expertise:     updatedData.expertise ?? [],
            teachingStyle: updatedData.teachingStyle ?? [],
          },
        }),
      }
      console.log('📤 full payload:', payload)
      
      const res = await apiUpdateProfile(backendUrl!, token!, payload)
      if (res.status !== 200) throw new Error('Failed to update profile')
      return res.data
    },
    onSuccess: () => {
      toast.success('Profile updated successfully!')
      setInitialData(updatedData)
      refreshProfile?.()
      queryClient.invalidateQueries({ queryKey: ['myProfile', token] })
      navigate('Home')
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile.')
    },
  })

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleInputChange = (
    field: keyof UpdatedProfileData,
    input:
      | string
      | React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
  ) => {
    const value = extractValue(input)
    setUpdatedData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSearch = (
    input: string | React.ChangeEvent<HTMLInputElement>
  ) => {
    const term = extractValue(input).toLowerCase()
    setSearchResults(
      availableProfiles.filter((p) =>
        p.name.toLowerCase().includes(term)
      )
    )
  }

  const handlePricingChange = (
    field: keyof UpdatedProfileData['pricing'],
    input: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(extractValue(input))
    setUpdatedData((prev) => ({
      ...prev,
      pricing: { ...prev.pricing, [field]: value },
    }))
  }

  const handlePaymentMethodChange = (
    input: React.ChangeEvent<HTMLSelectElement>
  ) => {
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

  const handleLanguageSelect = (language: string) => {
    setUpdatedData((prev) => ({
      ...prev,
      languages: {
        ...prev.languages,
        [language]: !prev.languages[
          language as keyof typeof prev.languages
        ],
      },
    }))
  }

  const handleAddRecommendation = (id: string) => {
    setUpdatedData((prev) => ({
      ...prev,
      recommended: [...prev.recommended, id],
    }))
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
          toast.error(
            `Video too long (${tmp.duration.toFixed(
              1
            )}s). Must be ≤30s.`
          )
        } else {
          setUpdatedData((prev) => ({
            ...prev,
            video: file,
          }))
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
    apiDeleteVideo(
      backendUrl!,
      token!,
      profile.id,
      updatedData.video
    )
      .then(() => {
        setUpdatedData((prev) => ({ ...prev, video: '' }))
        toast.success('Video deleted successfully.')
      })
      .catch(() => toast.error('Failed to delete video.'))
  }

  const handleToggleNotifications = () => {
    setUpdatedData((prev) => ({
      ...prev,
      notifications: !prev.notifications,
    }))
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
    isUploading: updateMutation.status === 'pending',
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
    handleSubmit,
  }
}

export default useManageProfileForm
