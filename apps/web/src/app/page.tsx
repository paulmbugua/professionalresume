import type { Metadata } from 'next';
import LandingPage from '../pages/Landing.web';
import { buildFaqSchema, buildPageMetadata } from '../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'CVPro | Build an ATS Resume & Cover Letter That Gets Interviews',
  description:
    'Create a professional resume online with ATS-ready templates, AI suggestions, and one-time $1 export unlock. Build faster and apply with confidence.',
  path: '/',
  keywords: [
    'ats resume builder',
    'resume templates',
    'online cv maker',
    'cover letter generator',
    'resume builder with ai',
  ],
});

const homepageFaq = buildFaqSchema([
  {
    question: 'What is CVPro?',
    answer:
      'CVPro helps you create ATS-friendly resumes with modern templates, AI writing support, and export-ready formatting.',
  },
  {
    question: 'How do I create a resume using CVPro?',
    answer:
      'Pick a template, add your details, improve content with AI assistance, and export your final resume.',
  },
  {
    question: 'Are CVPro templates ATS-friendly?',
    answer:
      'Yes. CVPro templates are structured for applicant tracking systems and clear recruiter readability.',
  },
]);

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageFaq) }} />
      <LandingPage />
    </>
  );
}
