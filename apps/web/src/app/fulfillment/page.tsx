import type { Metadata } from 'next';
import FulfillmentPolicyPage from '../../pages/FulfillmentPolicy';
import { buildBreadcrumbSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Fulfillment Policy | ProfessionalResume.co.ke',
  description:
    'Understand how ProfessionalResume.co.ke fulfills digital resume/CV and cover letter services after payment, including access timing and support steps.',
  path: '/fulfillment',
  keywords: ['ProfessionalResume.co.ke fulfillment policy', 'digital service delivery', 'resume builder access'],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Fulfillment Policy', path: '/fulfillment' },
]);

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <FulfillmentPolicyPage />
    </>
  );
}
