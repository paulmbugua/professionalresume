// apps/web/src/pages/HelpPage.web.tsx

import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.web'
import Footer from '../components/Footer.web'
import DeleteAccount from '../components/DeleteAccount.web'
import RequestDataDeletionForm from '../components/RequestDataDeletionForm.web'

const HelpPage: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen bg-darkGray text-white">
      {/* Navbar with no-op handlers */}
      <Navbar
        onSearch={() => {}}
        filters={{}}
        onFilterChange={() => {}}
        clearFilters={() => {}}
      />

      {/* Main content */}
      <main className="flex-grow p-8">
        <h1 className="text-4xl font-bold text-pink-300 mb-8 text-center">
          Help Center
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Delete Account card */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <DeleteAccount />
          </div>

          {/* Request Data Deletion card */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <RequestDataDeletionForm />
          </div>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default HelpPage
