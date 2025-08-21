// apps/web/src/layouts/SiteLayout.web.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar.web';
import Footer from '../components/Footer.web'; // ✅ import the footer
import { useHomePage } from '@mytutorapp/shared/hooks';

const SiteLayout: React.FC = () => {
  const { handleSearch } = useHomePage();

  return (
    <div className="min-h-screen flex flex-col bg-softGray dark:bg-darkBg text-darkText dark:text-darkTextPrimary">
      {/* Sticky Navbar */}
      <Navbar onSearch={handleSearch} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
};

export default SiteLayout;
