// packages/shared/hooks/useProfileDetail.ts

import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useShopContext, useChatContext } from '@mytutorapp/shared/context'
import { getTutorProfile } from '@mytutorapp/shared/api/profileDetailApi'
import type { Pricing } from '@mytutorapp/shared/types'
import type { ChatMessage, Profile } from '@mytutorapp/shared/types/ShopContextTypes'

export interface LocalTutorProfile {
  id: string
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
  user?: string
}

interface UseProfileDetailReturn {
  tutorProfile: LocalTutorProfile | null
  showChat: boolean
  newMessage: string
  setNewMessage: (msg: string) => void
  toggleChat: () => void
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
        setTutorProfile(data)
      } catch {
        toast.error('An error occurred while fetching tutor profile.')
      }
    }
    fetchProfile()
  }, [backendUrl, tutorId, token])

  const toggleChat = () => setShowChat(prev => !prev)

  const handleCreateSession = (navigateFn: (...args: any[]) => void) => {
    if (!tutorProfile) return
    const { id, name, pricing, category } = tutorProfile
    if (!id || !name || !pricing) {
      toast.error('Incomplete profile data.')
      return
    }

    // Build params object
    const params = {
      action: 'createSession',
      tutorId: id,
      tutorName: name,
      subject: category ?? '',
      pricing,
    }

    // Detect web (react-router) vs native (react-navigation)
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
      // Native: screen name + params
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
