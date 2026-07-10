import type { Metadata } from 'next';
import CoverLetterTemplatesPage from '../../../pages/CoverLetterTemplates.web';
import { buildBreadcrumbSchema, buildPageMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cover Letter Templates | Professional Job Application Designs | ProfessionalResume.co.ke',
  description:
    'Preview and choose professional cover letter templates, then launch into the ProfessionalResume.co.ke editor with your selected style.',
  path: '/cover-letters/templates',
  keywords: ['cover letter templates', 'professional cover letter design', 'application letter builder'],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Cover Letter Builder', path: '/cover-letter' },
  { name: 'Cover Letter Templates', path: '/cover-letters/templates' },
]);

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <CoverLetterTemplatesPage />
    </>
  );
}
