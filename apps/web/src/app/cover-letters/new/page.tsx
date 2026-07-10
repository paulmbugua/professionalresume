import type { Metadata } from 'next';
import CoverLetterNewPage from '../../../pages/CoverLetterNew.web';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Create Cover Letter Draft | ProfessionalResume.co.ke',
  description: 'Private cover letter draft creation flow for ProfessionalResume.co.ke users.',
  path: '/cover-letters/new',
  noIndex: true,
});

export default function Page() {
  return <CoverLetterNewPage />;
}
