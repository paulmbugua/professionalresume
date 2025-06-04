// packages/shared/hooks/useProfileDetail.ts

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useShopContext, useChatContext } from '@mytutorapp/shared/context'
import { getTutorProfile } from '@mytutorapp/shared/api/profileDetailApi'
import type { Pricing } from '@mytutorapp/shared/types'
import type { ChatMessage, Profile } from '@mytutorapp/shared/types/ShopContextTypes'

/**
 * Now includes a mandatory `user` field, which is the tutor’s users.id
 * (not the profiles.id).  This `user` value will be sent to createSession.
 */
export interface LocalTutorProfile {
  id: string                // profiles.id
  user: string              // users.id (foreign key)
  name: string
  pricing: Pricing
  category?: string
  gallery?: string[]
  video?: string
  role?: string
  status?: string
  lastOnline?: string
  description?: {
    bio?: string
    expertise?: string[]
    teachingStyle?: string[]
  }
  recommended?: LocalTutorProfile[]
  languages?: string[]
}

interface UseProfileDetailReturn {
  tutorProfile: LocalTutorProfile | null
  showChat: boolean
  newMessage: string
  setNewMessage: (msg: string) => void
  toggleChat: () => void
  /**
   * When creating a session, we pass `tutorProfile.user` (the users.id) as tutorId,
   * instead of profiles.id.  The server expects users.id → profiles.user_id.
   */
  handleCreateSession: (navigateFn: (...args: any[]) => void) => void
  handleSendMessage: () => Promise<void>
  chatMessages: ChatMessage[]
  selectedImage: string | null
  handleImageClick: (image: string) => void
  closeModal: () => void
  myProfile: Profile | null
}

const useProfileDetail = (
  tutorId: string,
  backendUrl: string
): UseProfileDetailReturn => {
  const { token, profile: myProfile } = useShopContext()
  const { sendMessage, chats } = useChatContext()

  const [tutorProfile, setTutorProfile] = useState<LocalTutorProfile | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    if (!token || !tutorId) return

    const fetchProfile = async () => {
      try {
        const data = await getTutorProfile(backendUrl, token, tutorId)

        // Verify that `data.user` exists (the users.id)
                const rawUser = data.user ?? (data as any).user_id;
        if (rawUser === undefined || rawUser === null) {
          console.error('[useProfileDetail] Missing `data.user` …', data);
          toast.error('Incomplete profile data from server.');
          return;
        }
        const tutorUserId = String(rawUser);

        setTutorProfile({
          id: data.id,
          user: data.user,
          name: data.name,
          pricing: data.pricing,
          category: data.category,
          gallery: data.gallery,
          video: data.video,
          role: data.role,
          status: data.status,
          lastOnline: data.lastOnline,
          description: data.description,
          recommended: data.recommended,
          languages: data.languages,
        })
      } catch {
        toast.error('An error occurred while fetching tutor profile.')
      }
    }

    fetchProfile()
  }, [backendUrl, tutorId, token])

  const toggleChat = () => setShowChat(prev => !prev)

  const handleCreateSession = (navigateFn: (...args: any[]) => void) => {
    if (!tutorProfile) return

    const { user: tutorUserId, name, pricing, category } = tutorProfile
    if (!tutorUserId || !name || !pricing) {
      toast.error('Incomplete profile data.')
      return
    }

    const params = {
      action: 'createSession',
      tutorId: tutorUserId,        // ← This is users.id
      tutorName: name,
      subject: category ?? '',
      pricing,
    }

    if (typeof window !== 'undefined' && window.document) {
      // Web: build query string
      const qp = new URLSearchParams({
        action: params.action,
        tutorId: params.tutorId,
        tutorName: params.tutorName,
        subject: params.subject,
        pricing: JSON.stringify(params.pricing),
      }).toString()
      navigateFn(`/account?${qp}`)
    } else {
      // Native: send params directly
      navigateFn('Account', params)
    }
  }

  const handleSendMessage = async () => {
    if (!token) {
      toast.error('You need to be logged in to send messages.')
      return
    }
    if (newMessage.trim() && tutorProfile) {
      await sendMessage(tutorProfile.id, newMessage.trim())
      setNewMessage('')
      setShowChat(false)
    } else {
      toast.error("Message content can't be empty.")
    }
  }

  const chatMessages: ChatMessage[] =
    chats.find(c => String(c.recipientId) === String(tutorProfile?.id))
      ?.messages ?? []

  const handleImageClick = (image: string) => setSelectedImage(image)
  const closeModal = () => setSelectedImage(null)

  return {
    tutorProfile,
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
