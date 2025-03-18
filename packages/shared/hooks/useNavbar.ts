// /packages/shared/hooks/useNavbar.ts
import { useState, useEffect, useContext } from 'react';
import { useSafeNavigate } from '../utils/navigation';
import { fetchUserProfile } from '../api/profileApi';
import { ShopContext } from '../context/ShopContext';
import { getBackendUrl } from "../utils/env";

export const useNavbar = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const { unreadMessagesCount, token, logout, language, toggleLanguage } = useContext(ShopContext)!;
  console.log("Type of unreadMessagesCount:", typeof unreadMessagesCount, unreadMessagesCount);

  const navigate = useSafeNavigate();
  const backendUrl = getBackendUrl();

  // Fetch user profile to determine if a profile exists.
  useEffect(() => {
    const getProfile = async () => {
      try {
        const data = await fetchUserProfile(backendUrl, token);
        setShowAlert(!data.profileExists);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    if (token) {
      getProfile();
    }
  }, [backendUrl, token]);

  const handleSearch = () => searchTerm;
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const handleLogoClick = () => {
    setSearchTerm('');
    navigate('/');
  };
  const handleSettingsClick = () => {
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
