import type { Metadata } from 'next';
import CoverLettersPage from '../../pages/CoverLetters.web';
import { buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Cover Letters | ProfessionalResume.co.ke',
  description: 'Manage your private ProfessionalResume.co.ke cover letter drafts and exports.',
  path: '/cover-letters',
  noIndex: true,
});

export default function Page() {
  return <CoverLettersPage />;
}
