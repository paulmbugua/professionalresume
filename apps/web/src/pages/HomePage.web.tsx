// /apps/web/src/pages/HomePage.web.tsx

import React, { useState } from 'react';
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
    onFilterChange,
    clearFilters,
  } = useHomePage();

  // sidebar state moved into this component
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen text-white">
        Loading tutor profiles...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-softGray">
      {/* Top Navbar with Search Functionality */}
      <Navbar onSearch={handleSearch} />

      {/* Sidebar Toggle Button for Mobile */}
      <button
        className="md:hidden absolute top-4 left-4 z-30 bg-plum text-white p-2 rounded-lg focus:outline-none shadow-lg"
        onClick={() => setSidebarOpen(!isSidebarOpen)}
      >
        <FontAwesomeIcon
          icon={(isSidebarOpen ? faTimes : faBars) as IconProp}
          size="lg"
        />
      </button>

      {/* Main Content Area */}
      <div className="flex flex-grow overflow-hidden">
        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-20 transform ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } md:relative md:translate-x-0 transition-transform duration-300 ease-in-out bg-plum text-white w-64 shadow-xl rounded-r-lg`}
        >
          <Sidebar onFilterChange={onFilterChange} />
        </div>

        {/* Main Profile Content */}
        <div className="flex-grow overflow-y-auto p-6">
          <ProfileGrid
            profiles={filteredProfiles.map(profile => ({
              // satisfy Profile type
              user_id: profile.id!,
              id: profile.id!,
              name: profile.name ?? 'N/A',
              category: profile.category ?? 'N/A',
              expertise: profile.expertise ?? [],
              teachingStyle: profile.teachingStyle ?? [],
              gallery: profile.gallery
                ? profile.gallery
                    .map(image => {
                      if (!image) return '';
                      if (typeof image === 'string') return image;
                      if ('url' in image && typeof image.url === 'string') {
                        return image.url;
                      }
                      return '';
                    })
                    .filter((url): url is string => url !== '')
                : [],
              // pass through any other optional fields
              age: profile.age,
              languages: profile.languages,
              ageGroup: profile.ageGroup,
              bio: profile.bio,
              pricing: profile.pricing,
              expertiseDetails: profile.expertiseDetails,
              teachingStyleDetails: profile.teachingStyleDetails,
              notifications: profile.notifications,
              paymentMethod: profile.paymentMethod,
            } as Profile))}
          />
          <Footer />
        </div>
      </div>

      {/* Overlay to close sidebar on mobile */}
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
