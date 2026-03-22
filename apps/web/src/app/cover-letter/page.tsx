import type { Metadata } from 'next';
import CoverLetterPage from '../../pages/CoverLetterPage.web';

export const metadata: Metadata = {
  title: 'Cover Letter | CVPro',
  description: 'Build and export a matching cover letter.',
};

export default function Page() {
  return <CoverLetterPage />;
}

