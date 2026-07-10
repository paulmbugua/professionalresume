import type { Metadata } from 'next';
import CvDraftsPage from '../../pages/CvDrafts.web';
import { buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Resume Drafts | ProfessionalResume.co.ke',
  description: 'Private dashboard for your resume drafts and recent CV projects in ProfessionalResume.co.ke.',
  path: '/builder',
  noIndex: true,
});

export default function Page() {
  return <CvDraftsPage />;
}
