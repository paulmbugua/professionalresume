import React from 'react';

import SupportPageLayout from '../components/site/SupportPageLayout';

const lastUpdated = 'March 28, 2026';

export default function AntiSpamPolicyPage() {
  return (
    <SupportPageLayout
      eyebrow="Compliance"
      title="Anti-Spam Policy"
      description="ProfessionalResume.co.ke is committed to responsible communications. We do not tolerate spam, deceptive outreach, or misuse of platform messaging features."
      lastUpdated={lastUpdated}
      sections={[
        {
          id: 'no-unsolicited-bulk',
          title: 'No unsolicited bulk email',
          body: (
            <p>
              ProfessionalResume.co.ke does not send unsolicited bulk email. We do not permit use of our services to send
              spam, harvest contacts, or distribute unwanted mass communications.
            </p>
          ),
        },
        {
          id: 'message-purpose',
          title: 'Why we send emails',
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Account and authentication actions (e.g., login and verification notices).</li>
              <li>Receipts, billing confirmations, and payment-related service messages.</li>
              <li>Support follow-ups and issue resolution updates.</li>
              <li>Service updates related to your ProfessionalResume.co.ke usage.</li>
              <li>Optional promotional or educational messages only when you opt in.</li>
            </ul>
          ),
        },
        {
          id: 'deception',
          title: 'No deceptive practices',
          body: (
            <p>
              We do not use misleading headers, false sender information, or deceptive subject lines.
              Message content should accurately reflect the purpose of the communication.
            </p>
          ),
        },
        {
          id: 'unsubscribe',
          title: 'Unsubscribe and opt-out',
          body: (
            <p>
              Non-essential messages include clear unsubscribe or opt-out options. Transactional
              communications required to operate your account (such as receipts or security alerts) may
              still be sent as needed.
            </p>
          ),
        },
        {
          id: 'abuse-reporting',
          title: 'Report suspected abuse',
          body: (
            <p>
              If you receive suspicious or abusive messages claiming to be from ProfessionalResume.co.ke, email
              support@professionalresume.co.ke with the full message details so our team can investigate.
            </p>
          ),
        },
        {
          id: 'misuse-consequences',
          title: 'Consequences for misuse',
          body: (
            <p>
              Misuse of forms, referral tools, or email-related features may result in account
              restrictions, suspension, or permanent access removal. We may also take additional action
              where required to protect users and maintain compliance.
            </p>
          ),
        },
      ]}
    />
  );
}
