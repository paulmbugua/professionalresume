// apps/web/src/components/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faCog, faCoins, faBars } from '@fortawesome/free-solid-svg-icons';
import { assets } from '../assets/assets';
import { useNavbar } from '@shared/hooks/useNavbar';

interface NavbarProps {
  onSearch: (term: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearch }) => {
  const {
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
  } = useNavbar();

  // Dummy handler for hamburger menu (if needed)
  const handleMenuToggle = () => {
    console.log("Hamburger menu clicked");
  };

  return (
    <div>
      <nav className="bg-plum text-white px-6 py-4 shadow-lg">
        {/* Mobile: Hamburger, Logo & Icons */}
        <div className="flex items-center justify-between md:hidden mb-2">
          <div className="flex items-center space-x-2">
            {/* Hamburger Icon */}
            <button onClick={handleMenuToggle} className="focus:outline-none">
              <FontAwesomeIcon icon={faBars} className="h-6 w-6" />
            </button>
            {/* Logo with added spacing */}
            <button onClick={handleLogoClick} className="focus:outline-none ml-2">
              <img src={assets.logo} alt="Logo" className="h-14 w-auto" />
            </button>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/messages" className="relative text-sm font-medium hover:text-softPink transition-colors duration-200">
              <FontAwesomeIcon icon={faEnvelope} className="h-6 w-6" />
              {Number(unreadMessagesCount) > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                  {Number(unreadMessagesCount).toString()}
                </span>
              )}
            </Link>
            <Link to="/settings" onClick={handleSettingsClick} className="relative text-sm font-medium hover:text-softPink transition-colors duration-200">
              <FontAwesomeIcon icon={faCog} className="text-lg" />
              {showAlert && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                  !
                </span>
              )}
            </Link>
            <Link to="/buy-tokens" className="flex flex-col items-center text-gold hover:text-softPink transition-colors duration-200">
              <FontAwesomeIcon icon={faCoins} className="text-2xl" />
            </Link>
            {token ? (
              <button onClick={handleLogout} className="text-sm font-medium hover:text-softPink transition-colors duration-200">
                Logout
              </button>
            ) : (
              <Link to="/login" className="text-sm font-medium hover:text-softPink transition-colors duration-200">
                Login
              </Link>
            )}
            <button onClick={toggleLanguage} className="text-sm font-medium hover:text-softPink transition-colors duration-200">
              {language}
            </button>
          </div>
        </div>

        {/* Desktop: Logo and Centered Search Bar */}
        <div className="hidden md:flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <button onClick={handleLogoClick} className="focus:outline-none">
              <img src={assets.logo} alt="Logo" className="h-10 w-auto" />
            </button>
          </div>

          {/* Centered Search Bar */}
          <div className="flex-grow max-w-lg mx-auto">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Search Tutors or Subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 rounded-l-lg border border-softPink text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-softPink"
              />
              <button
                onClick={handleSearch}
                className="bg-softPink text-white font-medium px-4 py-2 rounded-r-lg hover:bg-secondary transition-colors duration-200"
              >
                Search
              </button>
            </div>
          </div>

          {/* Desktop Icons */}
          <div className="flex items-center space-x-6">
            <Link to="/messages" className="relative text-sm font-medium hover:text-softPink transition-colors duration-200">
              <FontAwesomeIcon icon={faEnvelope} className="h-5 w-5" />
              {Number(unreadMessagesCount) > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                  {Number(unreadMessagesCount).toString()}
                </span>
              )}
            </Link>
            <Link to="/settings" onClick={handleSettingsClick} className="relative text-sm font-medium hover:text-softPink transition-colors duration-200">
              <FontAwesomeIcon icon={faCog} className="text-lg" />
              {showAlert && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                  !
                </span>
              )}
            </Link>
            <Link to="/buy-tokens" className="flex flex-col items-center text-gold hover:text-softPink transition-colors duration-200">
              <FontAwesomeIcon icon={faCoins} className="text-2xl" />
              <span className="text-sm font-medium">Buy Tokens</span>
            </Link>
            {token ? (
              <button onClick={handleLogout} className="text-sm font-medium hover:text-softPink transition-colors duration-200">
                Logout
              </button>
            ) : (
              <Link to="/login" className="text-sm font-medium hover:text-softPink transition-colors duration-200">
                Login
              </Link>
            )}
            <button onClick={toggleLanguage} className="text-sm font-medium hover:text-softPink transition-colors duration-200">
              <span>{language}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Search Bar */}
      <div className="md:hidden bg-plum p-2">
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Search Tutors or Subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow p-1 text-sm rounded-l-lg border border-softPink text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-softPink"
          />
          <button
            onClick={handleSearch}
            className="bg-softPink text-white text-sm font-medium px-2 py-1 rounded-r-lg hover:bg-secondary transition-colors duration-200"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
