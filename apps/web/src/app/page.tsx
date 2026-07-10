import type { Metadata } from 'next';
import Script from 'next/script';
import LandingPage from '../pages/Landing.web';
import { brand, seoKeywords } from '../lib/brand';
import { buildFaqSchema, buildPageMetadata } from '../lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: `${brand.name} | Build a Professional CV That Gets You Hired`,
  description:
    'Kenya-focused AI CV builder, resume optimizer, cover letter generator, ATS checker, templates, interview coach, and career dashboard.',
  path: '/',
  keywords: [
    ...seoKeywords,
    'Kenyan resume builder',
    'AI CV builder Kenya',
    'M-Pesa CV downloads',
  ],
});

const homepageFaq = buildFaqSchema([
  {
    question: `What is ${brand.name}?`,
    answer:
      `${brand.name} is a Kenya-focused AI career platform for CVs, resumes, cover letters, ATS optimization, templates, interview practice, and career coaching.`,
  },
  {
    question: `How do I create a CV using ${brand.name}?`,
    answer:
      'Pick a Kenya-ready template, import or enter your details, improve content with AI, check ATS fit, and export your final CV.',
  },
  {
    question: `Are ${brand.name} templates ATS-friendly?`,
    answer:
      'Yes. The templates use clean headings, readable structure, and recruiter-friendly formatting for Kenyan and international roles.',
  },
]);

export default function Page() {
  return (
    <>
      <Script
        id="cvpro-homepage-faq-ld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageFaq) }}
      />
      <LandingPage />
    </>
  );
}

