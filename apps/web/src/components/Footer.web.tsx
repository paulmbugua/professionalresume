// apps/web/src/components/Footer.tsx

import React from 'react'
import { Link } from 'react-router-dom'
import playStoreBadge from '../assets/android_icon.png'
import { useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useShopContext();

  const handleJoinClick = () => {
    if (!token) {
      navigate('/login');
    } else {
      navigate('/become-tutor');
    }
  };


  return (
    <footer className="bg-gray-900 text-gray-300 py-8 px-6 md:px-12 lg:px-20">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:justify-between items-center border-b border-gray-700 pb-6 mb-6">
        <div className="text-center md:text-left mb-4 md:mb-0">
        <p className="text-lg font-semibold">Become a Tutor!</p>
        <button
          onClick={handleJoinClick}
          className="mt-1 text-softPink hover:underline focus:outline-none"
        >
          Join <span className="font-bold">FunzaSasa Tutors</span>
        </button>
      </div>
        <div className="text-center md:text-left mb-4 md:mb-0">
          <p className="text-lg font-semibold">Partner with Us!</p>
          <a href="#" className="text-softPink hover:underline">
            FunzaSasa<span className="font-bold"> PARTNERS</span>
          </a>
        </div>
        <div className="text-center md:text-left">
          <p className="text-lg font-semibold">Need Assistance?</p>
          <a href="#" className="text-softPink hover:underline">
            FAQ / Contact Support
          </a>
        </div>
        <div className="flex space-x-4 mt-4 md:mt-0">
          <a href="#" className="text-white text-xl hover:text-softPink">
            Facebook
          </a>
          <a href="#" className="text-white text-xl hover:text-softPink">
            Telegram
          </a>
        </div>
      </div>

      {/* Middle Section */}
      <div className="flex flex-col md:flex-row md:justify-between border-b border-gray-700 pb-6 mb-6">
        {/* Left: contact info */}
        <div className="md:w-2/3 text-center md:text-left text-sm text-gray-400">
          <p className="mb-4">Support | FAQ | Partner with Us | Report Issues</p>
          <p className="text-xs mt-4">
            Address: 42 Riverside Drive, Nairobi, Kenya
            <br />
            Email: support@funzasasa.co.ke
            <br />
            Phone: +254 720423764
          </p>
        </div>
        {/* Right: download badge */}
        <div className="md:w-1/3 flex justify-center md:justify-end items-center mt-6 md:mt-0">
          <a
            href="https://play.google.com/store/apps/details?id=com.funzasasa"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={playStoreBadge}
              alt="Get it on Google Play"
              className="h-12 md:h-16"
            />
          </a>
        </div>
      </div>

      {/* Bottom Links */}
      <div className="text-center md:text-left text-xs text-gray-500 flex flex-col md:flex-row md:justify-between space-y-2 md:space-y-0">
        <Link to="/privacy-policy" className="hover:text-softPink">
          Privacy Policy
        </Link>
        <Link to="/terms" className="mt-1 text-softPink hover:underline">
          Terms of Service
        </Link>
        <Link to="/anti-spam-policy" className="hover:text-softPink">
          Anti-Spam Policy
        </Link>
        <Link to="/complaints-feedback" className="hover:text-softPink">
          Complaints & Feedback
        </Link>
      </div>

      {/* Bottom Text Section */}
      <div className="mt-6 text-center text-xs text-gray-500 space-y-2">
        <h3 className="text-sm font-semibold text-gray-400">
          EXPERIENCE LIVE TUTORING ONLINE
        </h3>
        <p>
          Connecting with skilled tutors is easy on funzasasa.co.ke; use any device to join a live
          session for personalized learning.
        </p>
        <p>HOW DOES LIVE TUTORING WORK?</p>
        <p>
          Just book a session with your preferred tutor, join the online Zoom meeting room, and
          enjoy real-time guidance.
        </p>
      </div>
    </footer>
  )
}

export default Footer
