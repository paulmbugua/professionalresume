import type { Metadata } from 'next';
import HelpPage from '../../pages/HelpPage.web';
import { buildBreadcrumbSchema, buildFaqSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Help Center | ProfessionalResume.co.ke Support',
  description:
    'Get ProfessionalResume.co.ke support for resume/CV creation, cover letters, downloads, payments, account access, and troubleshooting.',
  path: '/help',
  keywords: ['ProfessionalResume.co.ke help', 'resume builder support', 'cover letter support'],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Help Center', path: '/help' },
]);

const faqSchema = buildFaqSchema([
  {
    question: 'How quickly can I create a resume on ProfessionalResume.co.ke?',
    answer:
      'Most users can create or improve a resume in minutes using templates and AI assistance in ProfessionalResume.co.ke.',
  },
  {
    question: 'What should I do if export does not work after payment?',
    answer:
      'Email support@professionalresume.co.ke with your account email and payment reference so support can verify and restore access.',
  },
  {
    question: 'Where can I submit a complaint or formal feedback?',
    answer:
      'Use the Complaints and Feedback page at /complaints-feedback or email support@professionalresume.co.ke.',
  },
]);

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <HelpPage />
    </>
  );
}
