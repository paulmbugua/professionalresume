import type { Metadata } from 'next';

import PromptMarketingPage from '../../components/site/PromptMarketingPage';
import { brand, kenyaMarketSegments, seoKeywords } from '../../lib/brand';
import { buildBreadcrumbSchema, buildPageMetadata, buildSoftwareApplicationSchema } from '../../lib/seo';

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildSoftwareApplicationSchema()) }}
      />
      <PromptMarketingPage
        eyebrow="Kenyan ATS intelligence"
        title="Optimize your CV before recruiters and applicant tracking systems see it"
        description={`${brand.name} checks structure, keywords, sections, formatting, and role fit for Kenyan and international job applications.`}
        primaryLabel="Check My CV"
        sections={[
          {
            title: 'Role matching',
            body: 'Compare your CV against job adverts and get targeted keyword, headline, summary, skills, and experience suggestions.',
            items: ['Government CV Kenya', 'NGO CV Kenya', 'Graduate CV Kenya'],
          },
          {
            title: 'Market-aware scoring',
            body: 'Tune applications for Kenyan counties, ministries, parastatals, banks, SACCOs, universities, TVETs, and global employers.',
            items: kenyaMarketSegments.slice(0, 5),
          },
          {
            title: 'Clean exports',
            body: 'Use ATS-safe layouts and download ready-to-submit PDF, DOCX, and TXT versions from your account.',
            items: ['PDF download', 'DOCX download', 'TXT download'],
          },
        ]}
      />
    </>
  );
}
