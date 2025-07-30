// packages/shared/hooks/useProfileForm.ts

// ----------------------------------------------------------
// At the very top of packages/shared/hooks/useProfileForm.ts

export interface UploadAsset {
  uri: string
  name?: string
  type?: string
  duration?: number
}

// Augment the global FormData interface so this file “sees” our RN overload:
declare global {
  interface FormData {
    append(name: string, file: { uri: string; name?: string; type?: string }): void
  }
}
// ----------------------------------------------------------

import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import useAppQuery from './useAppQuery'
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
  const { onSuccess, token: tokenProp, notify } = options ?? {}
  const { token: contextToken, refreshProfile, backendUrl } = useShopContext()
  const token = tokenProp ?? contextToken ?? ''

  // ── 1️⃣ Fetch the user's role via React Query ───────────────────────────────
  const {
    data: role,
    isLoading: isRoleLoading,
    error: roleError,
  } = useAppQuery<Role, Error>(
    ['userRole', token],
    async () => {
      console.log('useProfileForm → fetching role from:', backendUrl, 'token:', token)
      const r = await fetchUserRole(backendUrl, token)
      console.log('useProfileForm → fetched role:', r)
      return r as Role
    },
    { enabled: Boolean(token) }
  )

  // Notify on fetch-userRole errors
  useEffect(() => {
    if (roleError) {
      console.error('useProfileForm → roleError:', roleError)
      notify?.('Error fetching user role', 'error')
    }
  }, [roleError, notify])

  // -- Form state --
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [languages, setLanguages] = useState<Record<string, boolean>>({
    English: false,
    Swahili: false,
    French: false,
    Spanish: false,
    German: false,
  })
  const [ageGroup, setAgeGroup] = useState<string[]>([])
  const [category, setCategory] = useState('')
  const [bio, setBio] = useState('')
  const [expertise, setExpertise] = useState<string[]>([])
  const [teachingStyle, setTeachingStyle] = useState<string[]>([])
  const [pricing, setPricing] = useState({
    privateSession: '',
    groupSession: '',
    lecture: '',
    workshop: '',
  })
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [bankAccount, setBankAccount] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('')

  // Upload assets state
  const [images, setImages] = useState<(UploadAsset | File | null)[]>([
    null,
    null,
    null,
    null,
  ])
  const [video, setVideo] = useState<UploadAsset | File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)

  // -- Handlers --
  const handleLanguageSelect = (language: string) =>
    setLanguages((prev) => ({ ...prev, [language]: !prev[language] }))

  const handleAgeGroupChange = (value: string) =>
    setAgeGroup((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )

  const handlePricingChange = (
    field: keyof typeof pricing,
    value: string
  ) => setPricing((prev) => ({ ...prev, [field]: value }))

  const handleVideoChange = (asset: UploadAsset | File) => {
    if ('duration' in asset && asset.duration != null) {
      const raw = asset.duration
      const durSec = raw > 1000 ? raw / 1000 : raw
      if (durSec > 30) throw new Error('Video must be 30 seconds or shorter')
    }
    setVideo(asset)
    if ('uri' in asset) setVideoPreview(asset.uri)
    else setVideoPreview(URL.createObjectURL(asset))
  }

  const handleRemoveVideo = () => {
    setVideo(null)
    setVideoPreview(null)
  }

  // ── 2️⃣ Submit with React Query's useMutation ────────────────────────────────
  const mutation = useMutation<any, Error, void>({
    mutationFn: async () => {
      if (!role) throw new Error('Role not loaded')

      // collect selections
      const selectedLanguages = Object.keys(languages).filter(
        (l) => languages[l]
      )

      // upload images
      let gallery: string[] = []
      if (role === 'tutor') {
        const valid = images.filter(
          (i): i is UploadAsset | File => i !== null
        )
        if (valid.length === 0)
          throw new Error('At least one profile image is required.')
        gallery = await Promise.all(
          valid.map(async (file) => {
            const uri = file instanceof File ? file : file.uri
            return uploadAsset(backendUrl, token, uri, 'image')
          })
        )
      }

      // upload video
      let videoUrl: string | null = null
      if (role === 'tutor' && video) {
        const uri = video instanceof File ? video : video.uri
        videoUrl = await uploadAsset(backendUrl, token, uri, 'video')
      }

      // build payload
      const payload: ProfilePayload = {
        role: role as Role,
        name: name.trim(),
        age: Number(age),
        languages: selectedLanguages,
        ageGroup,
        ...(role === 'tutor' && {
          category,
          description: { bio, expertise, teachingStyle },
          pricing,
          paymentMethod: paymentMethod as 'bank' | 'mpesa',
          ...(paymentMethod === 'bank' && { bankAccount, bankCode }),
          ...(paymentMethod === 'mpesa' && { mpesaPhoneNumber }),
          gallery,
          video: videoUrl,
        }),
      }

      let res
      try {
        res = await createProfileJson(backendUrl, token, payload)
      } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
          console.error('Server validation error:', err.response.data)
          throw new Error(err.response.data.message)
        }
        throw err
      }

      if (res.status !== 201) {
        console.error(
          'Unexpected status during createProfileJson:',
          res.status,
          res.data
        )
        throw new Error(`Unexpected status: ${res.status}`)
      }
      return res.data
    },
    onSuccess: () => {
      notify?.('Profile created successfully!', 'success') ??
        toast.success('Profile created successfully!')
      refreshProfile?.()
      options?.onSuccess?.()
    },
    onError: (err: Error) => {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : err.message
      notify?.(msg, 'error') ?? toast.error(msg)
    },
  })

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault?.()
    mutation.mutate()
  }

  return {
    // role + loading state
    role,
    isRoleLoading,
    roleError,

    // form state & setters
    name,
    setName,
    age,
    setAge,
    languages,
    handleLanguageSelect,
    ageGroup,
    handleAgeGroupChange,
    category,
    setCategory,
    bio,
    setBio,
    expertise,
    setExpertise,
    teachingStyle,
    setTeachingStyle,
    pricing,
    handlePricingChange,
    paymentMethod,
    setPaymentMethod,
    bankAccount,
    setBankAccount,
    bankCode,
    setBankCode,
    mpesaPhoneNumber,
    setMpesaPhoneNumber,

    // uploads
    images,
    setImages,
    video,
    videoPreview,
    handleVideoChange,
    handleRemoveVideo,

    // submission
    loading: mutation.isPending,
    submitError: mutation.error,
    handleSubmit,
  }
}

export default useProfileForm
