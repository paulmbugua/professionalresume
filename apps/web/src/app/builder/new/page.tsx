import type { Metadata } from 'next';
import CvBuilderNewPage from '../../../pages/CvBuilderNew.web';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Create Resume Draft | ProfessionalResume.co.ke',
  description: 'Private ProfessionalResume.co.ke draft creation flow.',
  path: '/builder/new',
  noIndex: true,
});

export default function Page() {
  return <CvBuilderNewPage />;
}
