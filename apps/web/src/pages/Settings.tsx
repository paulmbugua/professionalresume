// /apps/web/src/pages/SettingsPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
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
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CreateProfileForm from '../components/CreateProfileForm';
import ManageProfileForm from '../components/ManageProfileForm';
import AccountSection from '../components/AccountSection';
import CertificationSettings from '../components/CertificationSettings';
import { useSettings } from '@shared/hooks/useSettings';
import { toast } from 'react-toastify';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeSection, menuItems, handleMenuClick } = useSettings();

  // Render the active section based on the current state.
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSection />;
      case 'manageProfile':
        return <ManageProfileForm />; // or <CreateProfileForm /> if no profile exists
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

      {/* Sidebar for desktop */}
      <div className="w-72 bg-gradient-to-b from-plum to-purple-700 p-6 shadow-lg hidden md:block">
        <h2 className="text-3xl font-bold mb-8 border-b border-pink-400 pb-2">Settings</h2>
        <div className="space-y-5">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={`flex items-center gap-4 w-full text-lg font-medium transition-all duration-300 ${
                item.disabled ? 'opacity-50 cursor-not-allowed' : 'text-pink-400 hover:text-pink-500'
              }`}
            >
              <FontAwesomeIcon icon={item.icon} className="text-2xl" />
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

      {/* Mobile Footer Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-plum to-purple-800 p-4 shadow-lg">
        <div className="flex justify-around">
          {menuItems
            .filter((item) => item.id !== 'logout')
            .map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item)}
                className={`flex flex-col items-center gap-1 text-sm font-medium ${
                  item.disabled ? 'opacity-50 cursor-not-allowed' : 'text-pink-400 hover:text-pink-500'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="text-2xl" />
                {item.label}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
