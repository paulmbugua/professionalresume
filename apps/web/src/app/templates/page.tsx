import type { Metadata } from 'next';
import CvTemplatesPage from '../../pages/CvTemplates.web';
import { buildBreadcrumbSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Resume Templates | ATS-Friendly CV Designs | ProfessionalResume.co.ke',
  description:
    'Browse professional ATS-friendly resume templates by style and job level. Preview layouts and start editing instantly in ProfessionalResume.co.ke.',
  path: '/templates',
  keywords: ['resume templates', 'ats cv template', 'professional resume design', 'cv templates online'],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Resume Templates', path: '/templates' },
]);

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <CvTemplatesPage />
    </>
  );
}
