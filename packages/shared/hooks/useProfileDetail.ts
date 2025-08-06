// packages/shared/hooks/useProfileDetail.ts

import axios, { AxiosError } from 'axios'
import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import useAppQuery from './useAppQuery'
import { useShopContext, useChatContext } from '@mytutorapp/shared/context'
import { getTutorProfile } from '@mytutorapp/shared/api/profileDetailApi'
import type { Pricing, TutorProfile } from '@mytutorapp/shared/types'
import type { ChatMessage, Profile } from '@mytutorapp/shared/types/ShopContextTypes'

interface RawTutorProfile {
  id: string | number
  user?: string
  user_id?: string
  name: string
  pricing: Pricing
  category?: string
  gallery?: string[]
  video?: string
  role?: string
  status?: string
  certified?: boolean
  lastOnline?: string
  description?: {
    bio?: string
    expertise?: string[]
    teachingStyle?: string[]
  }
  recommended?: RawTutorProfile[]
  languages?: string[]
  rating?: number
  totalReviews?: number
}

export default function useProfileDetail(
  tutorId: string,
  backendUrl: string
) {
  const { token, profile: myProfile } = useShopContext()
  const { sendMessage, chats } = useChatContext()

  const [showChat, setShowChat] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  const { data: tutorProfile = null, isLoading: loading } = useAppQuery<
    TutorProfile | null,
    Error
  >(
    ['tutorProfile', tutorId],
    async () => {
      if (!tutorId) return null
      const base = backendUrl.replace(/\/$/, '')
      let raw: RawTutorProfile

      try {
        raw = await getTutorProfile(base, token || '', tutorId) as RawTutorProfile
      } catch (err) {
        const ae = err as AxiosError
        if (ae.response?.status === 404) {
          const url = `${base}/api/profile/${tutorId}`
          try {
            const resp = await axios.get<RawTutorProfile>(url, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              timeout: 10000,
            })
            raw = resp.data
          } catch (fbErr) {
            console.error('[useProfileDetail] fallback failed', fbErr)
            toast.error('Tutor profile not found.')
            return null
          }
        } else {
          console.error('[useProfileDetail] fetch error', ae)
          toast.error(
            ae.response?.status === 401
              ? 'Unauthorized – please log in again.'
              : 'Failed to load profile.'
          )
          return null
        }
      }

      const userId = raw.user ?? raw.user_id
      if (!userId) {
        console.error('[useProfileDetail] missing user field', raw)
        toast.error('Incomplete profile data from server.')
        return null
      }

      const recommended: TutorProfile[] = (raw.recommended ?? []).map(r => {
        const ru = r.user ?? r.user_id
        return {
          id:           String(r.id),
          user:         String(ru),
          name:         r.name,
          pricing:      r.pricing,
          category:     r.category,
          gallery:      r.gallery ?? [],
          video:        r.video,
          role:         r.role,
          status:       r.status,
          certified:    r.certified ?? false,
          lastOnline:   r.lastOnline,
          description:  r.description,
          recommended:  [],
          languages:    r.languages ?? [],
          rating:       r.rating ?? 0,
          totalReviews: r.totalReviews ?? 0,
        }
      })

      return {
        id:           String(raw.id),
        user:         String(userId),
        name:         raw.name,
        pricing:      raw.pricing,
        category:     raw.category,
        gallery:      raw.gallery ?? [],
        video:        raw.video,
        role:         raw.role,
        status:       raw.status,
        certified:    raw.certified ?? false,
        lastOnline:   raw.lastOnline,
        description:  raw.description,
        recommended,
        languages:    raw.languages ?? [],
        rating:       raw.rating ?? 0,
        totalReviews: raw.totalReviews ?? 0,
      }
    },
    { enabled: !!tutorId }
  )

  const toggleChat = useCallback(() => setShowChat(v => !v), [])

  const handleCreateSession = useCallback(
    (navigateFn: (screen: string, params?: Record<string, any>) => void) => {
      if (!tutorProfile) return
      const { user: tutorUserId, name, pricing, category } = tutorProfile
      if (!tutorUserId || !name || !pricing) {
        toast.error('Incomplete profile data.')
        return
      }
      navigateFn('Account', {
        action:    'createSession',
        tutorId:   tutorUserId,
        tutorName: name,
        subject:   category || '',
        pricing,
      })
    },
    [tutorProfile]
  )

  const handleSendMessage = useCallback(async () => {
    if (!token) {
      toast.error('You need to be logged in to send messages.')
      return
    }
    if (!newMessage.trim() || !tutorProfile) {
      toast.error("Message can't be empty.")
      return
    }
    await sendMessage(tutorProfile.id, newMessage.trim())
    setNewMessage('')
    setShowChat(false)
  }, [newMessage, sendMessage, tutorProfile, token])

  const chatMessages: ChatMessage[] =
    chats.find(c => String(c.recipientId) === String(tutorProfile?.id))
      ?.messages ?? []

  const handleImageClick = useCallback((img: string) => setSelectedImage(img), [])
  const closeModal      = useCallback(() => setSelectedImage(null), [])

  return {
    tutorProfile,
    loading,
    showChat,
    newMessage,
    setNewMessage,
    toggleChat,
    handleCreateSession,
    handleSendMessage,
    chatMessages,
    selectedImage,
    handleImageClick,
    closeModal,
    myProfile,
  }
}
