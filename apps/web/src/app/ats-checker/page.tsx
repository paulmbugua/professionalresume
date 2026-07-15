import type { Metadata } from 'next';

import AtsCheckerClient from '../../features/ats-checker/AtsCheckerClient';
import { brand, seoKeywords } from '../../lib/brand';
import {
  buildBreadcrumbSchema,
  buildPageMetadata,
  buildSoftwareApplicationSchema,
} from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: `ATS Resume Checker Kenya | ${brand.name}`,
  description:
    'Check and optimize your CV for Kenyan employers, NGOs, government portals, county roles, UN agencies, and international ATS systems.',
  path: '/ats-checker',
  keywords: ['ATS Resume Kenya', 'ATS CV checker Kenya', 'CV optimizer Kenya', ...seoKeywords],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'ATS Checker', path: '/ats-checker' },
]);

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildSoftwareApplicationSchema()) }}
      />
      <AtsCheckerClient />
    </>
  );
}
