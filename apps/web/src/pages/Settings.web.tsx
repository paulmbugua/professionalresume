import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronLeft,
  faUserCircle,
  faEdit,
  faCertificate,
  faQuestionCircle,
  faGlobe,
  faPowerOff,
} from '@fortawesome/free-solid-svg-icons';
import CreateProfileForm from '../components/CreateProfileForm.web';
import ManageProfileForm from '../components/ManageProfileForm.web';
import AccountSection from '../components/AccountSection.web';
import CertificationSettings from '../components/CertificationSettings.web';
import { toast } from 'react-toastify';
import { useSettings } from '@shared/hooks';

const SettingsWeb = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const paymentSuccess = queryParams.get('success') === 'true';

  useEffect(() => {
    if (paymentSuccess) {
      toast.success('Payment was successful! Your tokens have been updated.');
    }
  }, [paymentSuccess]);

  const { hasProfile, activeSection, menuItems, handleMenuClick } = useSettings({
    alertFn: (title, message) => toast.info(`${title}: ${message}`),
    navigateFn: (destination) => navigate(`/${destination}`),
  });

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSection />;
      case 'manageProfile':
        return hasProfile ? <ManageProfileForm /> : <CreateProfileForm />;
      case 'certification':
        return <CertificationSettings />;
      case 'help':
        return <div>Help Center</div>;
      case 'language':
        return <div>Language Settings</div>;
      default:
        return <div>Account Details</div>;
    }
  };

  return (
    <div className="flex h-screen bg-darkGray text-white relative">
      <button
        onClick={() => navigate('/')}
        className="fixed top-16 left-4 md:absolute md:top-6 md:left-6 bg-pink-500 hover:bg-pink-600 text-white py-2 px-4 rounded-full shadow-lg transition-all flex items-center gap-2 z-50"
      >
        <FontAwesomeIcon icon={faChevronLeft} />
        Back
      </button>

      {/* Sidebar */}
      <div className="w-72 bg-gradient-to-b from-plum to-purple-700 p-6 shadow-lg hidden md:block">
        <div className="mb-16"></div>
        <div className="space-y-5">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={`flex items-center gap-4 w-full text-lg font-medium transition-all duration-300 
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'text-pink-400 hover:text-pink-500'}`}
            >
              <FontAwesomeIcon
                icon={
                  item.id === 'account'
                    ? faUserCircle
                    : item.id === 'manageProfile'
                      ? faEdit
                      : item.id === 'certification'
                        ? faCertificate
                        : item.id === 'help'
                          ? faQuestionCircle
                          : item.id === 'language'
                            ? faGlobe
                            : item.id === 'logout'
                              ? faPowerOff
                              : faUserCircle
                }
                className="text-2xl"
              />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow p-6 md:p-12 bg-gray-900 rounded-tl-lg overflow-auto flex flex-col items-center sm:items-start min-h-screen pb-24">
        <h2 className="text-3xl font-extrabold text-pink-300 mb-8 text-center sm:text-left">
          {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
        </h2>
        {renderActiveSection()}
      </div>

      {/* Mobile Footer */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-plum to-purple-800 p-4 shadow-lg">
        <div className="flex justify-around">
          {menuItems
            .filter((item) => item.id !== 'logout')
            .map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`flex flex-col items-center gap-1 text-sm font-medium 
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'text-pink-400 hover:text-pink-500'}`}
              >
                <FontAwesomeIcon
                  icon={
                    item.id === 'account'
                      ? faUserCircle
                      : item.id === 'manageProfile'
                        ? faEdit
                        : item.id === 'certification'
                          ? faCertificate
                          : item.id === 'help'
                            ? faQuestionCircle
                            : item.id === 'language'
                              ? faGlobe
                              : faUserCircle
                  }
                  className="text-2xl"
                />
                {item.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsWeb;
