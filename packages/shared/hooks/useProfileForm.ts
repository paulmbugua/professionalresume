// packages/shared/hooks/useProfileForm.ts

// ----------------------------------------------------------
// At the very top of packages/shared/hooks/useProfileForm.ts

export interface UploadAsset {
  uri: string
  name?: string
  type?: string
}

// Augment the global FormData interface so this file “sees” our RN overload:
declare global {
  interface FormData {
    append(name: string, file: { uri: string; name?: string; type?: string }): void
  }
}
// ----------------------------------------------------------

import { useState, useEffect } from 'react'
import axios from 'axios'
import type { ProfilePayload, Role } from '@mytutorapp/shared/types'
import { fetchUserRole, createProfileJson } from '@mytutorapp/shared/api/profileApi'
import { uploadAsset } from '@mytutorapp/shared/api/uploadAsset'
import { useShopContext } from '@mytutorapp/shared/context'
import { toast } from 'react-toastify'

export interface UseProfileFormOptions {
  onSuccess?: () => void
  token?: string
  notify?: (message: string, type?: 'success' | 'error') => void
}

const useProfileForm = (options?: UseProfileFormOptions) => {
  const { onSuccess, token: tokenProp, notify } = options || {}
  const { token: contextToken, refreshProfile, backendUrl } = useShopContext()
  const token = tokenProp || contextToken || ''

  // Load the user's role
  const [role, setRole] = useState<string>('')
  useEffect(() => {
    if (!token) return
    fetchUserRole(backendUrl, token)
      .then(setRole)
      .catch(() => notify?.('Error fetching user role', 'error'))
  }, [token, backendUrl, notify])

  // -- Form state --
  const [name, setName]                   = useState('')
  const [age, setAge]                     = useState('')
  const [languages, setLanguages] = useState<Record<string, boolean>>({
    English: false,
    Swahili: false,
    French:  false,
    Spanish: false,
    German:  false,
  })
  const [ageGroup, setAgeGroup]           = useState<string[]>([])
  const [category, setCategory]           = useState('')
  const [bio, setBio]                     = useState('')
  const [expertise, setExpertise]         = useState<string[]>([])
  const [teachingStyle, setTeachingStyle] = useState<string[]>([])
  const [pricing, setPricing] = useState({
    privateSession: '',
    groupSession:   '',
    lecture:        '',
    workshop:       '',
  })
  const [paymentMethod, setPaymentMethod]     = useState('')  // string until cast
  const [bankAccount, setBankAccount]         = useState('')
  const [bankCode, setBankCode]               = useState('')
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('')

  // Upload assets state
  const [images, setImages]     = useState<(UploadAsset | File | null)[]>([
    null, null, null, null
  ])
  const [video, setVideo]       = useState<UploadAsset | File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)

  const [loading, setLoading]   = useState(false)

  // -- Handlers --
  const handleLanguageSelect = (language: string) =>
    setLanguages(prev => ({ ...prev, [language]: !prev[language] }))

  const handleAgeGroupChange = (value: string) =>
    setAgeGroup(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )

  const handleVideoChange = (asset: UploadAsset | File) => {
    if ('uri' in asset) {
      setVideo(asset)
      setVideoPreview(asset.uri)
    } else {
      setVideo(asset)
      setVideoPreview(URL.createObjectURL(asset))
    }
  }
  const handleRemoveVideo = () => {
    setVideo(null)
    setVideoPreview(null)
  }

  const handlePricingChange = (field: keyof typeof pricing, value: string) =>
    setPricing(prev => ({ ...prev, [field]: value }))

  // -- Submit Handler --
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.()

    const selectedLanguages = Object.keys(languages).filter(lang => languages[lang])
    console.log('▶️ handleSubmit data:', {
      role,
      name,
      age,
      selectedLanguages,
      ageGroup,
      category,
      bio,
      expertise,
      teachingStyle,
      pricing,
      paymentMethod,
      bankAccount,
      bankCode,
      mpesaPhoneNumber,
      imagesCount: images.filter(i => i !== null).length,
      hasVideo: Boolean(video),
    })

    setLoading(true)
    try {
      // 1️⃣ Upload images
      const validImages = images.filter((i): i is UploadAsset | File => i !== null)
      if (!validImages.length) {
        throw new Error('At least one profile image is required.')
      }
      const gallery = await Promise.all(
        validImages.map(asset =>
          asset instanceof File
            ? uploadAsset(backendUrl, token, asset, 'image')
            : uploadAsset(backendUrl, token, asset.uri, 'image')
        )
      )

      // 2️⃣ Upload video if present
      let videoUrl: string | null = null
      if (video) {
        videoUrl = video instanceof File
          ? await uploadAsset(backendUrl, token, video, 'video')
          : await uploadAsset(backendUrl, token, video.uri, 'video')
      }

      // 3️⃣ Build JSON payload
      const payload: ProfilePayload = {
        role: role as Role,          // cast string → Role union
        name: name.trim(),
        age: Number(age),
        languages: selectedLanguages,
        ...(role === 'student' && { ageGroup }),
        ...(role === 'tutor' && {
          category,
          description: { bio, expertise, teachingStyle },
          pricing,
          paymentMethod: paymentMethod as 'bank' | 'mpesa',  // cast to union
          bankAccount,
          bankCode,
          mpesaPhoneNumber,
          gallery,
          video: videoUrl,
        }),
      }

      // 4️⃣ Send JSON to create profile
      console.log('▶️ creating profile…')
      const response = await createProfileJson(backendUrl, token, payload)
      console.log('✅ createProfileJson status:', response.status)

      if (response.status === 201) {
        notify?.('Profile created successfully!', 'success')
        refreshProfile?.()
        onSuccess?.()
      } else {
        notify?.('Failed to create profile.', 'error')
      }
    } catch (err: unknown) {
      console.error('❌ handleSubmit error', err)
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : (err as Error).message
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return {
    // form state & setters
    role,
    name, setName,
    age, setAge,
    languages, handleLanguageSelect,
    ageGroup, handleAgeGroupChange,
    category, setCategory,
    bio, setBio,
    expertise, setExpertise,
    teachingStyle, setTeachingStyle,
    pricing, handlePricingChange,
    paymentMethod, setPaymentMethod,
    bankAccount, setBankAccount,
    bankCode, setBankCode,
    mpesaPhoneNumber, setMpesaPhoneNumber,

    // uploads
    images, setImages,
    video, videoPreview, handleVideoChange, handleRemoveVideo,

    // submission
    loading,
    handleSubmit,
  }
}

export default useProfileForm
