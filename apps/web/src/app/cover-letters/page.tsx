import type { Metadata } from 'next';
import CoverLetterTemplatesPage from '../../pages/CoverLetterTemplates.web';

export const metadata: Metadata = {
  title: 'Cover Letter Templates | CVPro',
  description: 'Browse professional cover letter templates and start drafting quickly.',
};

export default function Page() {
  return <CoverLetterTemplatesPage />;
}
