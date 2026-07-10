import type { Metadata } from 'next';
import CookiePolicyPage from '../../pages/CookiePolicy.web';
import { buildBreadcrumbSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cookie Policy | ProfessionalResume.co.ke',
  description:
    'Read how ProfessionalResume.co.ke uses cookies for essential functionality, analytics, preferences, and security across the resume and cover letter platform.',
  path: '/cookie-policy',
  keywords: ['ProfessionalResume.co.ke cookie policy', 'resume builder cookies', 'professionalresume cookies'],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Cookie Policy', path: '/cookie-policy' },
]);

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <CookiePolicyPage />
    </>
  );
}
