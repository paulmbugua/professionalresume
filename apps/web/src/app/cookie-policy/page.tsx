import type { Metadata } from 'next';
import CookiePolicyPage from '../../pages/CookiePolicy.web';
import { buildBreadcrumbSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cookie Policy | CVPro',
  description:
    'Read how CVPro uses cookies for essential functionality, analytics, preferences, and security across the resume and cover letter platform.',
  path: '/cookie-policy',
  keywords: ['CVPro cookie policy', 'resume builder cookies', 'onedollarcvpro cookies'],
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
