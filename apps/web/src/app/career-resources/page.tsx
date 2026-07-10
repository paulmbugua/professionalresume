import type { Metadata } from 'next';

import PromptMarketingPage from '../../components/site/PromptMarketingPage';
import { brand, seoKeywords, targetAudiences } from '../../lib/brand';
import { buildBreadcrumbSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: `Career Resources Kenya | CV Guides, Interviews & Salary Insights | ${brand.name}`,
  description:
    'Career resources for Kenyan graduates, professionals, TVET students, NGO applicants, government applicants, diaspora professionals, and international job seekers.',
  path: '/career-resources',
  keywords: ['Kenya CV writing guide', 'Kenya interview tips', 'salary guide Kenya', ...seoKeywords],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Career Resources', path: '/career-resources' },
]);

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <PromptMarketingPage
        eyebrow="Career resources"
        title="Kenya-first career guidance for local, remote, NGO, government, and international roles"
        description="Build better applications with practical CV writing, interview preparation, industry guides, migration resources, and salary insights."
        primaryHref="/blog"
        primaryLabel="Read Guides"
        secondaryHref="/ats-checker"
        secondaryLabel="Optimize CV"
        sections={[
          {
            title: 'Audience coverage',
            body: 'Guidance is organized around the people ProfessionalResume.co.ke serves most.',
            items: [...targetAudiences],
          },
          {
            title: 'Content roadmap',
            body: 'The platform is structured for 500+ SEO articles across CV writing, interviews, industries, migration, government jobs, NGO jobs, international resumes, and salary guides.',
            items: ['CV writing', 'Interviews', 'Salary guides'],
          },
          {
            title: 'AI coaching',
            body: 'Career coaching, interview practice, LinkedIn branding, and job matching are positioned inside the user dashboard.',
            items: ['AI interview coach', 'Career coach', 'LinkedIn branding'],
          },
        ]}
      />
    </>
  );
}

