// /apps/web/src/pages/HomePage.tsx

import Navbar from '../components/Navbar.web';
import Sidebar from '../components/Sidebar.web';
import ProfileGrid from '../components/ProfileGrid.web';
import Footer from '../components/Footer.web';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useHomePage } from '@shared/hooks';

const HomePage = () => {
  const {
    filteredProfiles,
    loading,
    isSidebarOpen,
    setSidebarOpen,
    handleSearch,
    onFilterChange,
  } = useHomePage();

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
        <FontAwesomeIcon icon={isSidebarOpen ? faTimes : faBars} size="lg" />
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
              ...profile,
              id: profile.id!, // ensure id is a string
              name: profile.name ?? 'N/A', // ensure name is a string
              category: profile.category ?? 'N/A', // ensure category is a string
              expertise: profile.expertise ?? [], // ensure expertise is a defined string[]
              teachingStyle: profile.teachingStyle ?? [], // ensure teachingStyle is a defined string[]
              gallery: profile.gallery
                ? profile.gallery
                    .map((image): string => {
                      if (!image) return '';
                      if (typeof image === 'string') return image;
                      if ('url' in image && typeof image.url === 'string') return image.url;
                      return '';
                    })
                    .filter((url): url is string => url !== '')
                : [],
            }))}
          />
          <Footer />
        </div>
      </div>

      {/* Overlay to close sidebar on mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default HomePage;
