// /packages/shared/hooks/useSettings.ts
import { useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { useSafeRoute, useSafeNavigate } from '../utils/navigation';
import { toast } from 'react-toastify';
import { ShopContext } from '../context/ShopContext';
import {
  faUserCircle,
  faEdit,
  faCertificate,
  faQuestionCircle,
  faGlobe,
  faPowerOff,
} from '@fortawesome/free-solid-svg-icons';

export const useSettings = () => {
  const navigate = useSafeNavigate();
  const location = useSafeRoute();

  // On web, cast location to an object with a 'search' property.
  const searchString = Platform.OS === 'web'
  ? (((location as unknown) as { search: string } | undefined)?.search) ?? ''
  : '';


  const queryParams = new URLSearchParams(searchString);
  const paymentSuccess = queryParams.get('success') === 'true';

  const { profile, loadingProfile } = useContext(ShopContext)!;
  const [hasProfile, setHasProfile] = useState(false);
  const [activeSection, setActiveSection] = useState('account');

  // Show payment success toast if applicable.
  useEffect(() => {
    if (paymentSuccess) {
      toast.success('Payment was successful! Your tokens have been updated.');
    }
  }, [paymentSuccess]);

  // Update hasProfile flag when profile loads.
  useEffect(() => {
    if (!loadingProfile && profile) {
      setHasProfile(true);
    } else {
      setHasProfile(false);
    }
  }, [loadingProfile, profile]);

  // Logout handler.
  const logout = () => {
    toast.info('Logged out successfully.');
    navigate('/login');
  };

  // Prepare menu items. For Certification, disable if user is not a tutor.
  const menuItems = [
    { id: 'account', label: 'My Account', icon: faUserCircle },
    { id: 'manageProfile', label: hasProfile ? 'Manage Profile' : 'Create Profile', icon: faEdit },
    {
      id: 'certification',
      label: 'Certification',
      icon: faCertificate,
      disabled: !profile || !profile.role || profile.role.toLowerCase() !== 'tutor',
    },
    { id: 'help', label: 'Help Center', icon: faQuestionCircle },
    { id: 'language', label: 'Your Language', icon: faGlobe },
    { id: 'logout', label: 'Log Out', icon: faPowerOff, action: logout },
  ];

  // Handle a menu click.
  const handleMenuClick = (item: any) => {
    if (item.disabled) {
      toast.info("Certification settings are available only for tutors.");
      return;
    }
    if (item.id === 'logout') {
      item.action();
    } else {
      setActiveSection(item.id);
    }
  };

  return {
    activeSection,
    setActiveSection,
    hasProfile,
    menuItems,
    handleMenuClick,
    logout,
  };
};
