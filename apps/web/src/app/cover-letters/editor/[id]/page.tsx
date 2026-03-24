import type { Metadata } from 'next';
import CoverLetterBuilderPage from '../../../../pages/CoverLetterBuilderPage.web';
import { buildPageMetadata } from '../../../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Cover Letter Editor | CVPro',
  description: 'Private cover letter editing workspace in CVPro.',
  path: '/cover-letters/editor/[id]',
  noIndex: true,
});

export default function Page() {
  return <CoverLetterBuilderPage />;
}
