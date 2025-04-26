import { useState, useEffect } from 'react';
import { fetchUserProfile } from '@mytutorapp/shared/api';
import { useShopContext } from '@mytutorapp/shared/context';

export interface UseNavbarOptions {
  onLogout?: () => void;
  onLogoClick?: () => void;
}

const useNavbar = (options?: UseNavbarOptions) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  const {
    unreadMessagesCount,
    token,
    logout,
    backendUrl,
    language,
    toggleLanguage,
  } = useShopContext();

  console.log('🧠 useNavbar initialized');
  console.log('📦 Context token:', token);
  console.log('🔗 Backend URL:', backendUrl);

  // Fetch user profile to determine if a profile exists
  useEffect(() => {
    const getProfile = async () => {
      try {
        const data = await fetchUserProfile(backendUrl, token);
        console.log('👤 Profile data fetched:', data);
        setShowAlert(!data.profileExists);
      } catch (error) {
        console.error('❌ Error fetching user profile:', error);
      }
    };

    if (token) {
      console.log('🔑 Token exists, fetching profile...');
      getProfile();
    } else {
      console.log('🚫 No token, skipping profile fetch');
    }
  }, [backendUrl, token]);

  const handleSearch = () => {
    console.log('🔎 Search triggered with:', searchTerm);
    return searchTerm;
  };

  const handleLogout = () => {
    console.log('🚪 Logging out...');
    logout();
    if (options?.onLogout) {
      options.onLogout();
    }
  };

  const handleLogoClick = () => {
    console.log('🏠 Logo clicked, clearing search and navigating home');
    setSearchTerm('');
    if (options?.onLogoClick) {
      options.onLogoClick();
    }
  };

  const handleSettingsClick = () => {
    console.log('⚙️ Settings clicked, clearing alert badge');
    setShowAlert(false);
  };

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
