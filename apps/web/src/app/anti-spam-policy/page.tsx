import type { Metadata } from 'next';
import AntiSpamPolicyPage from '../../pages/AntiSpamPolicy';
import { buildBreadcrumbSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Anti-Spam Policy | ProfessionalResume.co.ke',
  description:
    'Review ProfessionalResume.co.ke anti-spam commitments, permitted communications, unsubscribe expectations, and abuse reporting instructions.',
  path: '/anti-spam-policy',
  keywords: ['ProfessionalResume.co.ke anti-spam policy', 'email compliance', 'professionalresume support'],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Anti-Spam Policy', path: '/anti-spam-policy' },
]);

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <AntiSpamPolicyPage />
    </>
  );
}
