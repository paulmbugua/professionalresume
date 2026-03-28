import React from 'react';
import Link from 'next/link';

import SupportPageLayout from '../components/site/SupportPageLayout';

const lastUpdated = 'March 28, 2026';

export default function ComplaintsFeedbackPage() {
  return (
    <SupportPageLayout
      eyebrow="Support"
      title="Complaints & Feedback"
      description="Your feedback helps us improve CVPro for every job seeker. Whether you have a suggestion, concern, or issue, we want to hear from you and resolve it quickly."
      lastUpdated={lastUpdated}
      contactTitle="Send feedback or raise a concern"
      contactDescription="Email support@onedollarcvpro.com with relevant details (account email, screenshots, and payment reference when applicable). We aim to respond as promptly as possible."
      sections={[
        {
          id: 'general-feedback',
          title: 'General feedback',
          body: (
            <p>
              Share ideas on templates, AI suggestions, editor usability, and overall experience. Even
              short feedback helps us prioritize improvements.
            </p>
          ),
        },
        {
          id: 'service-complaints',
          title: 'Service complaints',
          body: (
            <p>
              If the platform did not meet your expectations, explain what happened and when. Include
              the steps taken so we can investigate and follow up with a practical resolution.
            </p>
          ),
        },
        {
          id: 'billing-concerns',
          title: 'Billing and payment concerns',
          body: (
            <p>
              For duplicate charges, payment confirmation delays, or checkout issues, include your
              receipt reference and account email in your message for faster support handling.
            </p>
          ),
        },
        {
          id: 'technical-issues',
          title: 'Technical issues',
          body: (
            <p>
              Report bugs such as failed saves, export/download issues, layout errors, or login
              problems. Helpful details include browser, device, and a screenshot of the issue.
            </p>
          ),
        },
        {
          id: 'content-account',
          title: 'Content or account concerns',
          body: (
            <p>
              Contact us about account access, profile concerns, or content that may be inaccurate or
              inappropriate. We review reported issues carefully and take corrective action when needed.
            </p>
          ),
        },
      ]}
    >
      <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white/92 p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0B1220]/80 dark:shadow-[0_12px_34px_rgba(0,0,0,0.28)]">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Support request checklist</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          <li>Subject line that describes the issue clearly.</li>
          <li>Account email used on CVPro.</li>
          <li>Timeline and steps to reproduce (if technical).</li>
          <li>Payment reference (if billing-related).</li>
          <li>Screenshots or attachments when helpful.</li>
        </ul>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          You can also review our <Link href="/help" className="underline underline-offset-4">Help Center</Link> or
          <Link href="/fulfillment" className="ml-1 underline underline-offset-4">Fulfillment Policy</Link> for quick answers.
        </p>
      </section>
    </SupportPageLayout>
  );
}
