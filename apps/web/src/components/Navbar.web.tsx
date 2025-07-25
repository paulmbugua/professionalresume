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

type OptionKey =
  | 'allTutors'
  | 'videos'
  | 'topRated'
  | 'lowPrice'
  | 'experienced'
  | 'category'
  | 'description.teachingStyle'
  | 'experienceLevel'
  | 'description.expertise'
  | 'ageGroup'
  | 'pricing'
  | 'videoCategory'
  | 'videoAgeGroup';

const NAV_OPTIONS: { key: OptionKey; label: string; type: 'reset' | 'sort' | 'dropdown' }[] = [
  { key: 'allTutors', label: 'All Tutors', type: 'reset' },
  { key: 'videos',    label: 'Videos',     type: 'dropdown' },
  { key: 'topRated',  label: 'Top Rated',  type: 'sort'     },
  { key: 'lowPrice',  label: 'Lowest Price', type: 'sort'   },
  { key: 'experienced', label: 'Most Experienced', type: 'sort' },
  { key: 'category',  label: 'Subject',        type: 'dropdown' },
  { key: 'description.teachingStyle', label: 'Teaching Style', type: 'dropdown' },
  { key: 'experienceLevel', label: 'Experience', type: 'dropdown' },
  { key: 'description.expertise', label: 'Expertise', type: 'dropdown' },
  { key: 'ageGroup',  label: 'Age Group',      type: 'dropdown' },
  { key: 'pricing',   label: 'Pricing',        type: 'dropdown' },
];

const DROPDOWNS: Record<OptionKey, string[]> = {
  allTutors: [],
  videos: ['Subject','Grade Level'],
  topRated: [],
  lowPrice: [],
  experienced: [],
  category: ['Math','Science','Programming','Art','Wellness','Languages'],
  'description.teachingStyle': ['One-on-One','Group','Workshop','Lecture'],
  experienceLevel: ['Beginner','Intermediate','Advanced','Expert'],
  'description.expertise': ['Exam Prep','Skill Building','Homework','Career Guidance'],
  ageGroup: ['Pre-Primary','Lower Primary','Upper Primary','University','Adults'],
  pricing: ['20–50','51–100','101–150','151–200'],
  videoCategory: ['Math','Science','Programming','Art','Wellness','Languages'],
  videoAgeGroup: ['Pre-Primary','Lower Primary','Upper Primary','University','Adults'],
};

interface NavbarProps {
  onSearch: (term: string) => void;
  filters?: Partial<Record<OptionKey, string[]>>;
  onFilterChange: (filterKey: OptionKey, value: string, merge: boolean) => void;
  clearFilters: () => void;
}

const Pill: FC<{ label: string; selected: boolean; onClick(): void }> = ({
  label, selected, onClick,
}) => (
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
  onSearch, filters = {}, onFilterChange, clearFilters,
}) => {
  const navigate = useNavigate();
  const {
    token, searchTerm, setSearchTerm,
    showAlert, unreadMessagesCount,
    language, toggleLanguage,
    handleLogout, handleLogoClick, handleSettingsClick,
  } = useNavbar({
    onLogout: () => navigate('/login'),
    onLogoClick: () => navigate('/'),
  });

  const debounced = useMemo(() => debounce(() => onSearch(searchTerm), 300), [onSearch, searchTerm]);
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
    () => Object.entries(filters).some(([k, arr]) => k !== 'allTutors' && (arr ?? []).length > 0),
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
          <Link to="/class-vault-library" className="hover:text-softPink" title="ClassVault">
            <FontAwesomeIcon icon={faVideo as IconProp} className="h-5 w-5" />
          </Link>
          <Link to="/messages" className="relative hover:text-softPink">
            <FontAwesomeIcon icon={faEnvelope as IconProp} className="h-5 w-5" />
            {unreadMessagesCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-600 text-xs text-white rounded-full px-1">
                {unreadMessagesCount}
              </span>
            )}
          </Link>
          <Link to="/settings" onClick={handleSettingsClick} className="relative hover:text-softPink">
            <FontAwesomeIcon icon={faCog as IconProp} className="h-5 w-5" />
            {showAlert && (
              <span className="absolute top-0 right-0 bg-red-600 text-xs text-white rounded-full px-1">
                !
              </span>
            )}
          </Link>
          <Link to="/buy-tokens" className="hover:text-softPink">
            <FontAwesomeIcon icon={faCoins as IconProp} className="h-5 w-5 text-[#FFD700]" />
          </Link>
          {token ? (
            <button onClick={handleLogout} className="hover:text-softPink">
              <FontAwesomeIcon icon={faSignOutAlt as IconProp} className="h-5 w-5" />
            </button>
          ) : (
            <Link to="/login" className="hover:text-softPink">
              <FontAwesomeIcon icon={faSignInAlt as IconProp} className="h-5 w-5" />
            </Link>
          )}
          <button onClick={toggleLanguage}>{language}</button>
        </div>
      </div>

      {/* Mobile Pills */}
      <div className="md:hidden flex flex-wrap overflow-x-auto scrollbar-hide gap-x-3 gap-y-2 py-2 bg-white bg-opacity-20">
        {NAV_OPTIONS.map(({ key, label, type }) => {
          const list = filters[key] ?? [];
          const selected = type === 'reset'
            ? !hasActiveFilters
            : type === 'dropdown'
            ? list.length > 0
            : false;

          return (
            <Pill
              key={key}
              label={label}
              selected={selected}
              onClick={() => {
                if (type === 'reset') {
                  clearFilters();
                  navigate('/');
                  setOpenDropdown(null);
                } else if (type === 'dropdown') {
                  if (key === 'videos') {
                    clearFilters();
                    navigate('/class-vault-library');
                    setOpenDropdown('videos');
                  } else {
                    setOpenDropdown(openDropdown === key ? null : key);
                  }
                } else {
                  onFilterChange(key, key, true);
                }
              }}
            />
          );
        })}
      </div>

      {/* Desktop Pills */}
      <div className="hidden md:flex justify-center space-x-3 py-2 bg-white bg-opacity-20">
        {NAV_OPTIONS.map(({ key, label, type }) => {
          const list = filters[key] ?? [];
          const selected = type === 'reset'
            ? !hasActiveFilters
            : type === 'dropdown'
            ? list.length > 0
            : false;

          return (
            <Pill
              key={key}
              label={label}
              selected={selected}
              onClick={() => {
                if (type === 'reset') {
                  clearFilters();
                  navigate('/');
                  setOpenDropdown(null);
                } else if (type === 'dropdown') {
                  if (key === 'videos') {
                    clearFilters();
                    navigate('/class-vault-library');
                    setOpenDropdown('videos');
                    return;
                  }
                  setOpenDropdown(openDropdown === key ? null : key);
                } else {
                  onFilterChange(key, key, true);
                }
              }}
            />
          );
        })}
      </div>

      {/* Two-level Dropdown */}
      {openDropdown && DROPDOWNS[openDropdown]?.length > 0 && (
        <div className="overflow-x-auto scrollbar-hide py-2 bg-plum flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          {openDropdown === 'videos'
            ? // Level 1: choose Subject vs Grade Level
              DROPDOWNS.videos.map(item => (
                <Pill
                  key={item}
                  label={item}
                  selected={false}
                  onClick={() =>
                    setOpenDropdown(item === 'Subject' ? 'videoCategory' : 'videoAgeGroup')
                  }
                />
              ))
            : // Level 2: actual filters
              DROPDOWNS[openDropdown].map(option => {
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
