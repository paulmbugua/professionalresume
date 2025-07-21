import React, { useState, useMemo } from 'react';
import Navbar from '../components/Navbar.web';
import Sidebar from '../components/Sidebar.web';
import ProfileGrid from '../components/ProfileGrid.web';
import Footer from '../components/Footer.web';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useHomePage } from '@mytutorapp/shared/hooks';
import type { Profile } from '@mytutorapp/shared/types';

const HomePage: React.FC = () => {
  const {
    filteredProfiles,
    loading,
    handleSearch,
    filters,
    onFilterChange,
    clearFilters,
  } = useHomePage();

  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Only tutors
  const tutorProfiles = useMemo(
    () => filteredProfiles.filter((p) => p.role === 'tutor'),
    [filteredProfiles]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-white">
        Loading tutor profiles...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-softGray">
      {/* Top Navbar with both Search & Filter Pills */}
      <Navbar
        onSearch={handleSearch}
        onFilterChange={onFilterChange}
        clearFilters={clearFilters}
        filters={filters}
      />

      {/* Sidebar Toggle (mobile) */}
      <button
        className="md:hidden absolute top-4 left-4 z-30 bg-plum text-white p-2 rounded-lg focus:outline-none shadow-lg"
        onClick={() => setSidebarOpen(!isSidebarOpen)}
      >
        <FontAwesomeIcon
          icon={(isSidebarOpen ? faTimes : faBars) as IconProp}
          size="lg"
        />
      </button>

      <div className="flex flex-grow overflow-hidden">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-20 transform ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
            bg-plum text-white w-64 shadow-xl rounded-r-lg`}
        >
          <Sidebar
            filters={filters}
            onFilterChange={onFilterChange}
            clearFilters={clearFilters}
          />
        </div>

        {/* Profile Grid */}
        <div className="flex-grow overflow-y-auto p-6">
          <ProfileGrid
            profiles={tutorProfiles.map((p) => ({
              id:            p.user_id,
              user_id:       p.user_id,
              role:          p.role,
              status:        p.status,
              certified:     p.certified === true || p.certified === 't',
              name:          p.name ?? 'N/A',
              category:      p.category ?? 'N/A',
              expertise:     p.expertise ?? [],
              teachingStyle: p.teachingStyle ?? [],
              gallery:       p.gallery ?? [],
              pricing:       p.pricing,
              video:         p.video,
              languages:     p.languages,
              recommended:   p.recommended,
              description:   p.description,
            } as Profile))}
          />
          <Footer />
        </div>
      </div>

      {/* Sidebar overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default HomePage;
