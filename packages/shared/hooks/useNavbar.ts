// packages/shared/hooks/useNavbar.ts

import { useState, useEffect } from 'react'
import { fetchTutorProfiles } from '@mytutorapp/shared/api'
import { fetchAllVideos } from '@mytutorapp/shared/api/classVaultApi'
import { useShopContext, useChatContext } from '@mytutorapp/shared/context'
import type { Profile, RecordedVideo } from '@mytutorapp/shared/types'

export interface UseNavbarOptions {
  onLogout?: () => void
  onLogoClick?: () => void
}

const useNavbar = (options?: UseNavbarOptions) => {
  // Local UI state
  const [searchTerm, setSearchTerm] = useState('')
  const [showAlert, setShowAlert] = useState(false)

  // Suggestions
  const [tutorSuggestions, setTutorSuggestions] = useState<Profile[]>([])
  const [videoSuggestions, setVideoSuggestions] = useState<RecordedVideo[]>([])

  // Context
  const { token, logout, backendUrl, language, toggleLanguage } = useShopContext()
  const { unreadCount } = useChatContext()
  const unreadMessagesCount = unreadCount

  // Fetch tutors
  useEffect(() => {
    if (!token) return
    fetchTutorProfiles(backendUrl)
      .then(setTutorSuggestions)
      .catch(err => console.error('Error fetching tutors', err))
  }, [backendUrl, token])

  // Fetch videos
  useEffect(() => {
    if (!token) return
    fetchAllVideos(backendUrl)            // ← only pass backendUrl
      .then(setVideoSuggestions)
      .catch(err => console.error('Error fetching videos', err))
  }, [backendUrl, token])

  // Handlers
  const handleSearch = () => searchTerm
  const handleLogout = () => { logout(); options?.onLogout?.() }
  const handleLogoClick = () => { setSearchTerm(''); options?.onLogoClick?.() }
  const handleSettingsClick = () => setShowAlert(false)

  return {
    token,
    searchTerm,
    setSearchTerm,
    showAlert,
    unreadMessagesCount,
    language,
    toggleLanguage,
    handleSearch,
    handleLogout,
    handleLogoClick,
    handleSettingsClick,
    tutorSuggestions,
    videoSuggestions,
  }
}

export default useNavbar
