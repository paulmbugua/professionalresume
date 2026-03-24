import type { Metadata } from 'next';
import CoverLettersPage from '../../pages/CoverLetters.web';
import { buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'My Cover Letters | CVPro',
  description: 'Manage your private CVPro cover letter drafts and exports.',
  path: '/cover-letters',
  noIndex: true,
});

export default function Page() {
  return <CoverLettersPage />;
}
