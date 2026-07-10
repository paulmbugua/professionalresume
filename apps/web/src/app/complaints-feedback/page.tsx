import type { Metadata } from 'next';
import ComplaintsFeedbackPage from '../../pages/ComplaintsFeedback';
import { buildBreadcrumbSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Complaints & Feedback | ProfessionalResume.co.ke',
  description:
    'Contact ProfessionalResume.co.ke with service complaints, billing concerns, technical issues, account concerns, and product feedback.',
  path: '/complaints-feedback',
  keywords: ['ProfessionalResume.co.ke complaints', 'ProfessionalResume.co.ke feedback', 'resume builder support'],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Complaints & Feedback', path: '/complaints-feedback' },
]);

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ComplaintsFeedbackPage />
    </>
  );
}
