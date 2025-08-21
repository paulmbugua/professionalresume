// apps/web/src/components/Privacy.web.tsx
import React from 'react';

const Privacy: React.FC = () => (
  <main className="max-w-3xl mx-auto p-6 text-gray-900">
    <h1 className="text-3xl font-bold mb-4">Tutorfy Privacy Policy</h1>

    <p><strong>Effective Date:</strong> June 24, 2025</p>
    <p>
      Tutorfy (“we”, “us” or “our”) is committed to protecting your privacy. This Privacy Policy explains how
      we collect, use, disclose, and safeguard your information when you use our mobile application Tutorfy
      (the “App”).
    </p>

    <h2 className="text-2xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
    <ol className="list-decimal list-inside space-y-2">
      <li>
        <h3 className="font-semibold">1.1 Personal Information You Provide</h3>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li><strong>Account Information:</strong> name, email address, profile picture.</li>
          <li><strong>Communications:</strong> messages, feedback, support requests.</li>
          <li><strong>Payment Information:</strong> billing details via our processor (we don’t store full card numbers).</li>
        </ul>
      </li>
      <li>
        <h3 className="font-semibold">1.2 Automatically Collected Information</h3>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li><strong>Device &amp; Usage Data:</strong> model, OS version, identifiers, crash reports, interactions.</li>
          <li><strong>Analytics:</strong> in-App events via Firebase Analytics or similar tools.</li>
          <li><strong>Location (optional):</strong> approximate location if you grant permission.</li>
        </ul>
      </li>
      <li>
        <h3 className="font-semibold">1.3 Third-Party Data</h3>
        <ul className="list-disc list-inside ml-4 space-y-1">
          <li><strong>Google Sign-In:</strong> basic Google profile (name, email, picture).</li>
          <li><strong>Firebase (optional):</strong> chat, notifications usage data.</li>
        </ul>
      </li>
    </ol>

    <h2 className="text-2xl font-semibold mt-6 mb-2">2. How We Use Your Information</h2>
    <ul className="list-disc list-inside ml-4 space-y-1">
      <li><strong>Provide &amp; Improve the Service:</strong> authenticate, manage sessions, personalize experience.</li>
      <li><strong>Communication:</strong> confirmations, updates, support, marketing (opt-in only).</li>
      <li><strong>Analytics &amp; Research:</strong> monitor trends and performance.</li>
      <li><strong>Security &amp; Fraud Prevention:</strong> detect and prevent abuse.</li>
      <li><strong>Legal Compliance:</strong> respond to lawful requests.</li>
    </ul>

    <h2 className="text-2xl font-semibold mt-6 mb-2">3. How We Share Your Information</h2>
    <p>We do not sell your personal information. We may share it with:</p>
    <ul className="list-disc list-inside ml-4 space-y-1">
      <li><strong>Service Providers:</strong> Google, Firebase, payment processor, Supabase, EAS Build, etc.</li>
      <li><strong>Tutors &amp; Students:</strong> to facilitate bookings, file exchanges, purchases.</li>
      <li><strong>Legal Authorities:</strong> if required by law or to protect rights.</li>
      <li><strong>Business Transfers:</strong> mergers, acquisitions, sales of assets.</li>
    </ul>

    <h2 className="text-2xl font-semibold mt-6 mb-2">4. Data Retention</h2>
    <p>We retain your information while your account is active or as needed to provide services. Usage data may be kept up to 24 months.</p>

    <h2 className="text-2xl font-semibold mt-6 mb-2">5. Your Rights &amp; Choices</h2>
    <ul className="list-disc list-inside ml-4 space-y-1">
      <li><strong>Access &amp; Correction:</strong> view or update your account details in App settings.</li>
      <li><strong>Deletion:</strong> request account deletion; we’ll erase personal data within 30 days (except legally required data).</li>
      <li><strong>Opt-Out:</strong> unsubscribe from marketing communications at any time.</li>
    </ul>

    <h2 className="text-2xl font-semibold mt-6 mb-2">6. Security</h2>
    <p>We use industry-standard measures (SSL/TLS, encrypted storage) to protect your data. No Internet transmission is completely secure—use strong, unique passwords.</p>

    <h2 className="text-2xl font-semibold mt-6 mb-2">7. International Data Transfers</h2>
    <p>Your data may be processed or stored outside your country (e.g. U.S. or EU). By using the App, you consent to these transfers.</p>

    <h2 className="text-2xl font-semibold mt-6 mb-2">8. Children’s Privacy</h2>
    <p>The App is intended for users 13+. We do not knowingly collect data from children under 13. Contact us if you believe otherwise.</p>

    <h2 className="text-2xl font-semibold mt-6 mb-2">9. Changes to This Policy</h2>
    <p>We may update this policy to reflect changes in practices or laws. We’ll notify you before material changes take effect.</p>

    <h2 className="text-2xl font-semibold mt-6 mb-2">10. Contact Us</h2>
    <p>
      Questions or requests? Email&nbsp;
      <a href="mailto:privacy@Tutorfy.co.ke" className="text-softPink hover:underline">
        privacy@Tutorfy.co.ke
      </a>
      &nbsp;or write to:
    </p>
    <p>
      Tutorfy Ltd.<br />
      1830 Thika<br />
      Nairobi, Kenya
    </p>
  </main>
);

export default Privacy;
