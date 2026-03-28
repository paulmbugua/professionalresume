import React from 'react';
import Link from 'next/link';

import SupportPageLayout from '../components/site/SupportPageLayout';

const lastUpdated = 'March 28, 2026';

export default function FulfillmentPolicyPage() {
  return (
    <SupportPageLayout
      eyebrow="Policy"
      title="Fulfillment Policy"
      description="This Fulfillment Policy explains how CVPro delivers its digital resume/CV and cover letter services after payment."
      lastUpdated={lastUpdated}
      sections={[
        {
          id: 'digital-service',
          title: 'Digital services only',
          body: (
            <p>
              CVPro sells digital services for creating, editing, and exporting resumes/CVs and cover
              letters. We do not ship physical products.
            </p>
          ),
        },
        {
          id: 'what-you-get',
          title: 'What fulfillment includes',
          body: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Access to resume/CV builder tools and editable templates.</li>
              <li>Cover letter creation and editing features.</li>
              <li>AI-assisted writing and optimization features where available.</li>
              <li>Download, print, or export functionality according to your plan or purchase.</li>
            </ul>
          ),
        },
        {
          id: 'delivery-timing',
          title: 'Delivery timing and access',
          body: (
            <p>
              Fulfillment is typically immediate after successful payment confirmation. In rare cases,
              access may take a short additional processing window due to payment verification or
              temporary service delays.
            </p>
          ),
        },
        {
          id: 'access-issues',
          title: 'If you experience access issues',
          body: (
            <p>
              If access is not available after payment, contact support@onedollarcvpro.com with your
              account email and payment reference. We will investigate and restore access or guide next
              steps as quickly as possible.
            </p>
          ),
        },
        {
          id: 'refunds-and-cancellations',
          title: 'Relation to refunds and cancellations',
          body: (
            <p>
              Fulfillment terms should be read together with our cancellation and refund terms where
              published. If you have a refund-related question, contact support so we can assess your
              case according to the applicable policy.
            </p>
          ),
        },
      ]}
    >
      <section className="mt-8 rounded-2xl border border-slate-200/80 bg-white/92 p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0B1220]/80 dark:shadow-[0_12px_34px_rgba(0,0,0,0.28)]">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Need immediate help?</h2>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          Visit the <Link href="/help" className="underline underline-offset-4">Help Center</Link> for common troubleshooting guidance, or use our
          <Link href="/complaints-feedback" className="ml-1 underline underline-offset-4">Complaints &amp; Feedback page</Link> to report unresolved fulfillment issues.
        </p>
      </section>
    </SupportPageLayout>
  );
}
