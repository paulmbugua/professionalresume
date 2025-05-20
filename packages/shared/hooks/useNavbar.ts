// packages/shared/hooks/useNavbar.ts

import { useState, useEffect } from 'react';
import { fetchUserProfile } from '@mytutorapp/shared/api';
import { useShopContext, useChatContext } from '@mytutorapp/shared/context';

export interface UseNavbarOptions {
  onLogout?: () => void;
  onLogoClick?: () => void;
}

const useNavbar = (options?: UseNavbarOptions) => {
  // Local UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  // Auth/profile/language from ShopContext
  const {
    token,
    logout,
    backendUrl,
    language,
    toggleLanguage,
  } = useShopContext();

  // Unread count comes from ChatContext
  const { unreadCount } = useChatContext();
  const unreadMessagesCount = unreadCount;

  console.log('🧠 useNavbar initialized');
  console.log('📦 Context token:', token);
  console.log('🔗 Backend URL:', backendUrl);
  console.log('💬 Unread messages:', unreadMessagesCount);

  // Check if user has completed their profile
  useEffect(() => {
    if (!token) return;
    const getProfile = async () => {
      try {
        const data = await fetchUserProfile(backendUrl, token);
        setShowAlert(!data.profileExists);
      } catch (error) {
        console.error('❌ Error fetching user profile:', error);
      }
    };
    getProfile();
  }, [backendUrl, token]);

  // Handlers
  const handleSearch = () => searchTerm;

  const handleLogout = () => {
    logout();
    options?.onLogout?.();
  };

  const handleLogoClick = () => {
    setSearchTerm('');
    options?.onLogoClick?.();
  };

  const handleSettingsClick = () => {
    setShowAlert(false);
  };

  // Expose everything
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
  };
};

export default useNavbar;
