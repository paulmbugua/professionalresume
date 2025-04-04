import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faCog, faCoins, faBars } from '@fortawesome/free-solid-svg-icons';
import logo from '../assets/logo.png';
import { useNavbar } from '@shared/hooks';

interface NavbarProps {
  onSearch: (term: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearch }) => {
  const navigate = useNavigate();

  // Pass callbacks for navigation so that the hook remains platform-agnostic.
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
  } = useNavbar({
    onLogout: () => navigate('/login'),
    onLogoClick: () => navigate('/'),
  });

  const handleMenuToggle = () => console.log('Hamburger clicked');

  return (
    <nav className="bg-plum text-white px-6 py-4 shadow-lg">
      {/* Mobile */}
      <div className="flex items-center justify-between md:hidden mb-2">
        <button onClick={handleMenuToggle} className="focus:outline-none">
          <FontAwesomeIcon icon={faBars} className="h-6 w-6" />
        </button>
        <button onClick={handleLogoClick} className="focus:outline-none ml-2">
          <img src={logo} alt="Logo" className="h-14 w-auto" />
        </button>
        <div className="flex items-center space-x-6">
          <Link to="/messages" className="relative hover:text-softPink">
            <FontAwesomeIcon icon={faEnvelope} className="h-6 w-6" />
            {unreadMessagesCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full px-1">
                {unreadMessagesCount}
              </span>
            )}
          </Link>
          <Link to="/settings" onClick={handleSettingsClick} className="relative hover:text-softPink">
            <FontAwesomeIcon icon={faCog} className="h-6 w-6" />
            {showAlert && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full px-1">
                !
              </span>
            )}
          </Link>
          <Link to="/buy-tokens" className="hover:text-softPink">
            <FontAwesomeIcon icon={faCoins} className="h-6 w-6" />
          </Link>
          {token ? (
            <button onClick={handleLogout} className="hover:text-softPink">
              Logout
            </button>
          ) : (
            <Link to="/login" className="hover:text-softPink">
              Login
            </Link>
          )}
          <button onClick={toggleLanguage}>{language}</button>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <button onClick={handleLogoClick}>
          <img src={logo} alt="Logo" className="h-10 w-auto" />
        </button>

        <div className="flex-grow max-w-lg mx-auto">
          <div className="flex">
            <input
              type="text"
              placeholder="Search Tutors or Subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow p-2 rounded-l-lg border border-softPink text-gray-800"
            />
            <button
              onClick={() => onSearch(handleSearch())}
              className="bg-softPink px-4 py-2 rounded-r-lg"
            >
              Search
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <Link to="/messages" className="relative hover:text-softPink">
            <FontAwesomeIcon icon={faEnvelope} className="h-5 w-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full px-1">
                {unreadMessagesCount}
              </span>
            )}
          </Link>
          <Link to="/settings" onClick={handleSettingsClick} className="relative hover:text-softPink">
            <FontAwesomeIcon icon={faCog} className="h-5 w-5" />
            {showAlert && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full px-1">
                !
              </span>
            )}
          </Link>
          <Link to="/buy-tokens" className="flex flex-col items-center hover:text-softPink">
            <FontAwesomeIcon icon={faCoins} className="h-5 w-5" />
            <span className="text-xs">Buy Tokens</span>
          </Link>
          {token ? (
            <button onClick={handleLogout} className="hover:text-softPink">
              Logout
            </button>
          ) : (
            <Link to="/login" className="hover:text-softPink">
              Login
            </Link>
          )}
          <button onClick={toggleLanguage}>{language}</button>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden bg-plum p-2">
        <div className="flex">
          <input
            type="text"
            placeholder="Search Tutors or Subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow p-1 rounded-l-lg border border-softPink text-gray-800"
          />
          <button onClick={() => onSearch(handleSearch())} className="bg-softPink px-2 rounded-r-lg">
            Search
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
