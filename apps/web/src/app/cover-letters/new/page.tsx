import type { Metadata } from 'next';
import CoverLetterNewPage from '../../../pages/CoverLetterNew.web';
import { buildPageMetadata } from '../../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Create Cover Letter Draft | CVPro',
  description: 'Private cover letter draft creation flow for CVPro users.',
  path: '/cover-letters/new',
  noIndex: true,
});

export default function Page() {
  return <CoverLetterNewPage />;
}
