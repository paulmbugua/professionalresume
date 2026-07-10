import type { Metadata } from 'next';

import PromptMarketingPage from '../../components/site/PromptMarketingPage';
import { brand, paymentMethods, platformCapabilities, seoKeywords } from '../../lib/brand';
import { buildBreadcrumbSchema, buildPageMetadata } from '../../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: `Pricing | CV, Cover Letter, ATS & Career Tools | ${brand.name}`,
  description:
    'Explore Kenyan and international payment options for CV downloads, cover letters, ATS reports, interview coaching, and career documents.',
  path: '/pricing',
  keywords: ['CV pricing Kenya', 'M-Pesa CV builder', 'resume builder Kenya pricing', ...seoKeywords],
});

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', path: '/' },
  { name: 'Pricing', path: '/pricing' },
]);

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <PromptMarketingPage
        eyebrow="Flexible payments"
        title="Pay for professional career documents with Kenyan and global payment methods"
        description="ProfessionalResume.co.ke is prepared for M-Pesa, Airtel Money, cards, PayPal, Apple Pay, and Google Pay across CV, cover letter, ATS, and coaching products."
        primaryLabel="Create CV"
        secondaryHref="/cover-letter"
        secondaryLabel="Build Cover Letter"
        sections={[
          {
            title: 'Supported methods',
            body: 'Payments are planned around the methods Kenyan job seekers and diaspora professionals already use.',
            items: [...paymentMethods],
          },
          {
            title: 'Product coverage',
            body: 'Pricing can cover one-time downloads, bundles, subscriptions, coaching, recruiter tools, and migration toolkits.',
            items: platformCapabilities.slice(0, 6),
          },
          {
            title: 'Admin controls',
            body: 'Admins can manage pricing, coupons, referrals, analytics, payments, AI prompts, templates, blogs, SEO, and users.',
            items: ['Pricing', 'Coupons', 'Referrals'],
          },
        ]}
      />
    </>
  );
}

