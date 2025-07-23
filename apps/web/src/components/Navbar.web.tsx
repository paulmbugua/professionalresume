// apps/web/src/components/Navbar.web.tsx

import React, { useState, useMemo, ChangeEvent, FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import {
  faBars,
  faVideo,
  faEnvelope,
  faCog,
  faCoins,
  faSignInAlt,
  faSignOutAlt,
} from '@fortawesome/free-solid-svg-icons';
import logo from '../assets/logo.png';
import debounce from 'lodash.debounce';
import { useNavbar } from '@mytutorapp/shared/hooks';

const NAV_OPTIONS = [
  { key: 'allTutors',      label: 'All Tutors',      type: 'reset'    },
  { key: 'topRated',       label: 'Top Rated',        type: 'sort'     },
  { key: 'lowPrice',       label: 'Lowest Price',     type: 'sort'     },
  { key: 'experienced',    label: 'Most Experienced', type: 'sort'     },
  { key: 'category',       label: 'Subject',          type: 'dropdown' },
  { key: 'description.teachingStyle',  label: 'Teaching Style',   type: 'dropdown' },
  { key: 'experienceLevel',label: 'Experience',       type: 'dropdown' },
  { key: 'description.expertise',      label: 'Expertise',        type: 'dropdown' },
  { key: 'ageGroup',       label: 'Age Group',        type: 'dropdown' },
  { key: 'pricing',        label: 'Pricing',          type: 'dropdown' },
] as const;

type OptionKey = typeof NAV_OPTIONS[number]['key'];

const DROPDOWNS: Record<OptionKey, string[]> = {
  allTutors:      [],
  topRated:       [],
  lowPrice:       [],
  experienced:    [],
  category:       ['Math','Science','Programming','Art','Wellness','Languages'],
  'description.teachingStyle': ['One-on-One','Group','Workshop','Lecture'],
  experienceLevel:['Beginner','Intermediate','Advanced','Expert'],
  'description.expertise':      ['Exam Prep','Skill Building','Homework','Career Guidance'],
  ageGroup:       ['Pre-Primary','Lower Primary','Upper Primary','University','Adults'],
  pricing:        ['20–50','51–100','101–150','151–200'],
};

interface NavbarProps {
  onSearch: (term: string) => void;
  filters?: Partial<Record<OptionKey, string[]>>;
  onFilterChange: (filterKey: OptionKey, value: string, merge: boolean) => void;
  clearFilters: () => void;
}

const Pill: FC<{
  label: string;
  selected: boolean;
  onClick: () => void;
}> = ({ label, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`mr-3 px-4 py-1 rounded-full text-sm focus:outline-none ${
      selected ? 'bg-softPink text-plum' : 'bg-white bg-opacity-20 text-white'
    }`}
  >
    {label}
  </button>
);

const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  filters = {},
  onFilterChange,
  clearFilters,
}) => {
  const navigate = useNavigate();
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
    onLogout:    () => navigate('/login'),
    onLogoClick: () => navigate('/'),
  });

  const debounced = useMemo(
    () => debounce(() => onSearch(searchTerm), 300),
    [onSearch, searchTerm]
  );
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    debounced();
  };
  const handleButtonSearch = () => {
    debounced.cancel();
    onSearch(searchTerm);
  };

  const [openDropdown, setOpenDropdown] = useState<OptionKey | null>(null);

  const hasActiveFilters = useMemo(
    () =>
      Object.entries(filters).some(
        ([k, arr]) => k !== 'allTutors' && (arr ?? []).length > 0
      ),
    [filters]
  );

  return (
    <nav className="bg-plum text-white px-6 py-4 shadow-lg">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <button onClick={() => console.log('Menu')} className="focus:outline-none">
            <FontAwesomeIcon icon={faBars as IconProp} className="h-6 w-6" />
          </button>
          <button onClick={handleLogoClick} className="ml-4 focus:outline-none">
            <img src={logo} alt="Logo" className="h-10 w-auto" />
          </button>
        </div>
        <div className="flex items-center space-x-6">
          {/* ClassVault Library (video) */}
          <Link
            to="/class-vault-library"
            className="hover:text-softPink"
            title="ClassVault Library"
          >
            <FontAwesomeIcon icon={faVideo as IconProp} className="h-5 w-5" />
          </Link>

          {/* Messages */}
          <Link to="/messages" className="relative hover:text-softPink">
            <FontAwesomeIcon icon={faEnvelope as IconProp} className="h-5 w-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full px-1">
                {unreadMessagesCount}
              </span>
            )}
          </Link>

          {/* Settings */}
          <Link to="/settings" onClick={handleSettingsClick} className="relative hover:text-softPink">
            <FontAwesomeIcon icon={faCog as IconProp} className="h-5 w-5" />
            {showAlert && (
              <span className="absolute top-0 right-0 bg-red-600 text-white text-xs rounded-full px-1">
                !
              </span>
            )}
          </Link>

          {/* Buy Tokens (icon only) */}
          <Link to="/buy-tokens" className="hover:text-softPink">
            <FontAwesomeIcon icon={faCoins as IconProp} className="h-5 w-5 text-[#FFD700]" />
          </Link>

          {/* Login / Logout (icon only) */}
          {token ? (
            <button onClick={handleLogout} className="hover:text-softPink">
              <FontAwesomeIcon icon={faSignOutAlt as IconProp} className="h-5 w-5" />
            </button>
          ) : (
            <Link to="/login" className="hover:text-softPink">
              <FontAwesomeIcon icon={faSignInAlt as IconProp} className="h-5 w-5" />
            </Link>
          )}

          {/* Language Toggle */}
          <button onClick={toggleLanguage}>{language}</button>
        </div>
      </div>

      {/* Mobile Filter Pills */}
      <div
        className="md:hidden flex flex-wrap overflow-x-auto scrollbar-hide gap-x-3 gap-y-2 py-2 bg-white bg-opacity-20"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {NAV_OPTIONS.map(({ key, label, type }) => {
          const list = filters[key] ?? [];
          const selected =
            type === 'reset'
              ? !hasActiveFilters
              : type === 'dropdown'
              ? list.length > 0
              : list.includes(key);

          return (
            <Pill
              key={key}
              label={label}
              selected={selected}
              onClick={() => {
                if (type === 'reset') {
                  clearFilters();
                } else if (type === 'dropdown') {
                  setOpenDropdown(openDropdown === key ? null : key);
                } else {
                  onFilterChange(key, key, true);
                }
              }}
            />
          );
        })}
      </div>

      {/* Desktop Filter Pills */}
      <div className="hidden md:flex justify-center space-x-3 py-2 bg-white bg-opacity-20">
        {NAV_OPTIONS.map(({ key, label, type }) => {
          const list = filters[key] ?? [];
          const selected =
            type === 'reset'
              ? !hasActiveFilters
              : type === 'dropdown'
              ? list.length > 0
              : list.includes(key);

          return (
            <Pill
              key={key}
              label={label}
              selected={selected}
              onClick={() => {
                if (type === 'reset') {
                  clearFilters();
                } else if (type === 'dropdown') {
                  setOpenDropdown(openDropdown === key ? null : key);
                } else {
                  onFilterChange(key, key, true);
                }
              }}
            />
          );
        })}
      </div>

      {/* Dropdown Options */}
      {openDropdown && DROPDOWNS[openDropdown].length > 0 && (
        <div className="overflow-x-auto scrollbar-hide md:flex md:justify-center py-2 bg-plum">
          {DROPDOWNS[openDropdown].map(option => {
            const list = filters[openDropdown] ?? [];
            return (
              <Pill
                key={option}
                label={option}
                selected={list.includes(option)}
                onClick={() => onFilterChange(openDropdown, option, true)}
              />
            );
          })}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
