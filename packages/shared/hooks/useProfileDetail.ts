// packages/shared/hooks/useProfileDetail.ts

import { useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import useAppQuery from './useAppQuery'
import { useShopContext, useChatContext } from '@mytutorapp/shared/context'
import { getTutorProfile } from '@mytutorapp/shared/api/profileDetailApi'
import type { Pricing } from '@mytutorapp/shared/types'
import type {
  ChatMessage,
  Profile,
} from '@mytutorapp/shared/types/ShopContextTypes'

export interface TutorDescription {
  bio?: string
  expertise?: string[]
  teachingStyle?: string[]
}

export interface LocalTutorProfile {
  id: string
  user: string
  name: string
  pricing: Pricing
  category?: string
  gallery?: string[]
  video?: string
  role?: string
  status?: string
  lastOnline?: string
  description?: TutorDescription
  recommended?: LocalTutorProfile[]
  languages?: string[]
}

interface UseProfileDetailReturn {
  tutorProfile: LocalTutorProfile | null
  loading: boolean
  showChat: boolean
  newMessage: string
  setNewMessage: (msg: string) => void
  toggleChat: () => void
  handleCreateSession: (
    navigateFn: (route: string, params?: Record<string, unknown>) => void
  ) => void
  handleSendMessage: () => Promise<void>
  chatMessages: ChatMessage[]
  selectedImage: string | null
  handleImageClick: (image: string) => void
  closeModal: () => void
  myProfile: Profile | null
}

interface TutorProfileResponse {
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
  lastOnline?: string
  description?: TutorDescription
  recommended?: LocalTutorProfile[]
  languages?: string[]
}

const useProfileDetail = (
  tutorId: string,
  backendUrl: string
): UseProfileDetailReturn => {
  const { token, profile: myProfile } = useShopContext()
  const { sendMessage, chats } = useChatContext()

  const [showChat, setShowChat] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // ── Load tutor profile ─────────────────────────────────────────────────────
  const {
    data: tutorProfile = null,
    isLoading: loading,
  } = useAppQuery<LocalTutorProfile | null, Error>(
    ['tutorProfile', tutorId],
    async () => {
      if (!tutorId) return null

      try {
        const raw = (await getTutorProfile(
          backendUrl.replace(/\/$/, ''),
          token || '',
          tutorId
        )) as TutorProfileResponse

        const rawUser = raw.user ?? raw.user_id
        if (!rawUser) {
          console.error('[useProfileDetail] Missing user data', raw)
          toast.error('Incomplete profile data from server.')
          return null
        }

        return {
          id: String(raw.id),
          user: String(rawUser),
          name: raw.name,
          pricing: raw.pricing,
          category: raw.category,
          gallery: raw.gallery,
          video: raw.video,
          role: raw.role,
          status: raw.status,
          lastOnline: raw.lastOnline,
          description: raw.description,
          recommended: raw.recommended,
          languages: raw.languages,
        }
      } catch (err) {
        const error = err as { response?: { status?: number } }
        if (error.response?.status === 404) {
          toast.error('Tutor profile not found.')
        } else {
          console.error('[useProfileDetail] fetch error', err)
          toast.error('Failed to load profile.')
        }
        return null
      }
    },
    {
      enabled: !!tutorId,
    }
  )

  // ── Chat toggles & session creation ─────────────────────────────────────────
  const toggleChat = useCallback(() => {
    setShowChat((v) => !v)
  }, [])

  const handleCreateSession = useCallback(
    (navigateFn: (route: string, params?: Record<string, unknown>) => void) => {
      if (!tutorProfile) return

      const { user: tutorUserId, name, pricing, category } = tutorProfile
      if (!tutorUserId || !name || !pricing) {
        toast.error('Incomplete profile data.')
        return
      }

      // Build query string for web vs native
      if (typeof window !== 'undefined' && window.document) {
        const qp = new URLSearchParams({
          action: 'createSession',
          tutorId: tutorUserId,
          tutorName: name,
          subject: category || '',
          pricing: JSON.stringify(pricing),
        }).toString()
        navigateFn(`/account?${qp}`)
      } else {
        navigateFn('Account', {
          action: 'createSession',
          tutorId: tutorUserId,
          tutorName: name,
          subject: category || '',
          pricing,
        })
      }
    },
    [tutorProfile]
  )

  // ── Sending a chat message ──────────────────────────────────────────────────
  const handleSendMessage = useCallback(async () => {
    if (!token) {
      toast.error('You need to be logged in to send messages.')
      return
    }
    if (!newMessage.trim() || !tutorProfile) {
      toast.error("Message content can't be empty.")
      return
    }

    await sendMessage(tutorProfile.id, newMessage.trim())
    setNewMessage('')
    setShowChat(false)
  }, [newMessage, sendMessage, tutorProfile, token])

  const chatMessages: ChatMessage[] =
    chats.find((c) => String(c.recipientId) === String(tutorProfile?.id))
      ?.messages ?? []

  // ── Image modal handlers ────────────────────────────────────────────────────
  const handleImageClick = useCallback((image: string) => {
    setSelectedImage(image)
  }, [])
  const closeModal = useCallback(() => {
    setSelectedImage(null)
  }, [])

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

export default useProfileDetail
