// /apps/web/src/components/Footer.tsx
const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-8 px-6 md:px-12 lg:px-20">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row md:justify-between items-center border-b border-gray-700 pb-6 mb-6">
        <div className="text-center md:text-left mb-4 md:mb-0">
          <p className="text-lg font-semibold">Become a Tutor!</p>
          <a href="#" className="text-softPink hover:underline">
            Join <span className="font-bold">Funazasasa Tutors</span>
          </a>
        </div>
        
        <div className="text-center md:text-left mb-4 md:mb-0">
          <p className="text-lg font-semibold">Partner with Us!</p>
          <a href="#" className="text-softPink hover:underline">
            Funazasasa<span className="font-bold"> PARTNERS</span>
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
      <div className="text-center md:text-left text-sm text-gray-400 border-b border-gray-700 pb-6 mb-6">
        <p className="mb-4">
          Support | FAQ | Partner with Us | Report Issues
        </p>
        <p className="text-xs mt-4">
          Address: 42 Riverside Drive, Nairobi, Kenya<br/>
          Email: support@funzasasa.co.ke<br/>
          Phone: +254 720423764
        </p>
      </div>

      {/* Bottom Links */}
      <div className="text-center md:text-left text-xs text-gray-500 flex flex-col md:flex-row md:justify-between space-y-2 md:space-y-0">
        <a href="#" className="hover:text-softPink">Privacy Policy</a>
        <a href="#" className="hover:text-softPink">Terms of Service</a>
        <a href="#" className="hover:text-softPink">Anti-Spam Policy</a>
        <a href="#" className="hover:text-softPink">Complaints & Feedback</a>
      </div>

      {/* Bottom Text Section */}
      <div className="mt-6 text-center text-xs text-gray-500 space-y-2">
        <h3 className="text-sm font-semibold text-gray-400">EXPERIENCE LIVE TUTORING ONLINE</h3>
        <p>
          Connecting with skilled tutors is easy on funzasasa.co.ke; use any device to join a live session for personalized learning.
        </p>
        <p>HOW DOES LIVE TUTORING WORK?</p>
        <p>
          Just book a session with your preferred tutor, join the online Zoom meeting room, and enjoy real-time guidance.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
