import type { Metadata } from 'next';

import PromptMarketingPage from '../../components/site/PromptMarketingPage';
import { brand, seoKeywords } from '../../lib/brand';
import { buildBreadcrumbSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: `Blog | Kenya CV Writing, Jobs, Interviews & Career Guides | ${brand.name}`,
  description:
    'SEO-focused career articles for CV writing, government jobs, NGO jobs, interviews, salary guides, migration, and international applications.',
  path: '/blog',
  keywords: ['CV writing Kenya blog', 'Kenya jobs guide', 'NGO jobs Kenya CV', ...seoKeywords],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Blog', path: '/blog' },
]);

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <PromptMarketingPage
        eyebrow="Career blog"
        title="Kenya-focused CV, interview, job search, salary, and migration guides"
        description="The blog hub is prepared for a 500+ article content strategy targeting high-intent Kenyan and international career search terms."
        primaryHref="/career-resources"
        primaryLabel="Explore Resources"
        secondaryHref="/builder/new?templateId=ats-minimal"
        secondaryLabel="Build CV"
        sections={[
          {
            title: 'CV writing clusters',
            body: 'Guides for professional CV Kenya, graduate CV Kenya, government CV Kenya, NGO CV Kenya, and role-specific long-tail searches.',
            items: ['Graduate CVs', 'Government CVs', 'NGO CVs'],
          },
          {
            title: 'Job market clusters',
            body: 'Articles can cover industries, salary guides, migration, diaspora applications, remote jobs, and international resume formats.',
            items: ['Industries', 'Migration', 'Salary insights'],
          },
          {
            title: 'Conversion paths',
            body: 'Each content path links naturally into templates, ATS checking, cover letters, resume optimization, and coaching.',
            items: ['Templates', 'ATS checker', 'Career coach'],
          },
        ]}
      />
    </>
  );
}
