// apps/web/src/components/TermsOfService.tsx

import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService: React.FC = () => (
  <div className="min-h-screen bg-gray-900 text-gray-200 p-6 flex flex-col">
    {/* Back link */}
    <Link to="/" className="text-pink-400 hover:underline self-start mb-4">
      ← Home
    </Link>

    <h1 className="text-4xl font-bold text-white mb-6">
      Tutorfy Tutors – Terms of Service
    </h1>

    <section className="space-y-6">
      <p>
        <strong>Last updated:</strong> July 25, 2025
      </p>
      <p>
        Welcome to Tutorfy Tutors! These Terms of Service (“Terms”) govern your use of our website and mobile applications (collectively, the “Service”). By accessing or using the Service, you agree to be bound by these Terms.
      </p>
    </section>

    <section className="mt-8 space-y-4">
      <h2 className="text-2xl font-semibold text-white">1. Eligibility</h2>
      <p>
        You must be at least 18 years old and capable of forming a binding contract to use our Service. Tutors must also hold any required qualifications or certifications in their area of instruction.
      </p>
    </section>

    <section className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold text-white">2. Account Registration</h2>
      <p>
        To access certain features (booking sessions, messaging), you must create an account with accurate, current, and complete information. You are responsible for safeguarding your password and for all activities under your account.
      </p>
    </section>

    <section className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold text-white">3. Tutor and Student Roles</h2>
      <ul className="list-disc list-inside">
        <li>
          <span className="font-semibold">Tutors:</span> Offer instructional services, set their own rates and availability, and are responsible for delivering lessons.
        </li>
        <li>
          <span className="font-semibold">Students:</span> Browse tutors, book sessions, pay fees, and provide feedback.
        </li>
      </ul>
    </section>

    <section className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold text-white">4. Booking & Payment</h2>
      <p>
        All session bookings occur through our platform. Students agree to pay the tutor’s stated fee plus any applicable taxes or platform fees. Payments are processed via our third-party payment provider; Tutorfy Tutors does not store your payment details.
      </p>
      <p className="font-semibold">Cancellations & Refunds:</p>
      <p>
        Students may cancel a session up to 24 hours before the scheduled start for a full refund. Cancellations within 24 hours are non-refundable unless otherwise agreed.
      </p>
    </section>

    <section className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold text-white">5. Messaging & Conduct</h2>
      <p>
        Our built-in messaging system is for scheduling, lesson details, and support. Harassment, hate speech, or any abusive behavior will result in account suspension or termination.
      </p>
    </section>

    <section className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold text-white">6. Content Ownership</h2>
      <p>
        You retain ownership of any content you post (profiles, messages). By using the Service, you grant Tutorfy Tutors a worldwide, royalty-free license to display and distribute that content in connection with the Service.
      </p>
    </section>

    <section className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold text-white">7. Privacy</h2>
      <p>
        Our <Link to="/privacy" className="text-pink-400 hover:underline">Privacy Policy</Link> explains how we collect and use your personal data. By using the Service, you consent to that collection and use.
      </p>
    </section>

    <section className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold text-white">8. Disclaimers & Limitation of Liability</h2>
      <p>
        The Service is provided “as is” and “as available.” To the fullest extent permitted by law, Tutorfy Tutors disclaims all warranties, express or implied. We are not responsible for any damages arising from your use of the Service or any tutor-student interactions.
      </p>
    </section>

    <section className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold text-white">9. Indemnification</h2>
      <p>
        You agree to indemnify and hold Tutorfy Tutors and its affiliates harmless from any claim, loss, or liability arising out of your violation of these Terms or your use of the Service.
      </p>
    </section>

    <section className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold text-white">10. Termination</h2>
      <p>
        We may suspend or terminate your access for any violation of these Terms or at our discretion. You may delete your account at any time from your account settings.
      </p>
    </section>

    <section className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold text-white">11. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. We will notify you by posting the new Terms here with an updated “Last updated” date. Continued use after such changes constitutes your acceptance.
      </p>
    </section>

    <section className="mt-6 space-y-4">
      <h2 className="text-2xl font-semibold text-white">12. Governing Law</h2>
      <p>
        These Terms are governed by the laws of Kenya, without regard to conflict of law principles.
      </p>
    </section>

    <section className="mt-6 mb-12 space-y-4">
      <h2 className="text-2xl font-semibold text-white">13. Contact Us</h2>
      <p>
        If you have questions or concerns about these Terms, please contact us at{' '}
        <a href="mailto:support@Tutorfy.com" className="text-pink-400 hover:underline">
          support@Tutorfy.com
        </a>.
      </p>
    </section>
  </div>
);

export default TermsOfService;
