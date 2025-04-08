import React, { useMemo, useEffect, ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faCog, faCoins, faBars } from '@fortawesome/free-solid-svg-icons';
import logo from '../assets/logo.png';
import debounce from 'lodash.debounce';
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
    handleLogout,
    handleLogoClick,
    handleSettingsClick,
  } = useNavbar({
    onLogout: () => navigate('/login'),
    onLogoClick: () => navigate('/'),
  });

  // Create a debounced search function that calls onSearch with the current search term.
  const debouncedSearch = useMemo(
    () =>
      debounce(() => {
        onSearch(searchTerm);
      }, 300),
    [onSearch, searchTerm]
  );

  // Cleanup: cancel any pending debounced calls on unmount.
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Handle input changes: update the search term and trigger the debounced search.
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    debouncedSearch();
  };

  // Optional: Immediate search when clicking the Search button.
  const handleButtonSearch = () => {
    // Cancel pending debounced call and immediately search.
    debouncedSearch.cancel();
    onSearch(searchTerm);
  };

  const handleMenuToggle = () => console.log('Hamburger clicked');

  return (
    <nav className="bg-plum text-white px-6 py-4 shadow-lg">
      {/* Mobile */}
      {/* Mobile */}
<div className="flex items-center md:hidden mb-2">
  <div className="flex items-center flex-1">
    <button onClick={handleMenuToggle} className="focus:outline-none">
      <FontAwesomeIcon icon={faBars} className="h-6 w-6" />
    </button>
    <button onClick={handleLogoClick} className="focus:outline-none ml-4">
      <img src={logo} alt="Logo" className="h-14 w-auto" />
    </button>
  </div>
  <div className="flex items-center space-x-3.5">
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
    <Link to="/buy-tokens">
  <FontAwesomeIcon
    icon={faCoins}
    className="h-6 w-6 text-[#FFD700] hover:text-softPink"
  />
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
              onChange={handleInputChange}
              className="flex-grow p-2 rounded-l-lg border border-softPink text-gray-800"
            />
            <button onClick={handleButtonSearch} className="bg-softPink px-4 py-2 rounded-r-lg">
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
            onChange={handleInputChange}
            className="flex-grow p-1 rounded-l-lg border border-softPink text-gray-800"
          />
          <button onClick={handleButtonSearch} className="bg-softPink px-2 rounded-r-lg">
            Search
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
