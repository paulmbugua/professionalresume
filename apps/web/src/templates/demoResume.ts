import type { CvDraft } from '@cvpro/shared/types';

export const demoResume: CvDraft = {
  id: 'demo-cv',
  userId: 'demo-user',
  title: 'Sample CV',
  templateId: 'ats-minimal',
  updatedAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
  basics: {
    name: 'Jordan Taylor',
    headline: 'Product Designer · UX Researcher',
    email: 'jordan.taylor@email.com',
    phone: '+1 (555) 123-4567',
    location: 'Austin, TX',
    links: [
      { label: 'Portfolio', url: 'jordan.design' },
      { label: 'LinkedIn', url: 'linkedin.com/in/jordan-taylor' },
    ],
  },
  summary:
    'Designer focused on accessible, data-informed experiences. 7+ years delivering B2B and consumer products across fintech and education.',
  skills: ['Product Strategy', 'Design Systems', 'Figma', 'User Research', 'Prototyping'],
  experience: [
    {
      company: 'Northwind Labs',
      role: 'Lead Product Designer',
      start: '2021',
      end: 'Present',
      location: 'Remote',
      bullets: [
        'Shipped a new onboarding flow that improved activation by 28%.',
        'Led a cross-functional design system migration across 12 squads.',
      ],
    },
    {
      company: 'Luma Education',
      role: 'UX Designer',
      start: '2018',
      end: '2021',
      location: 'Seattle, WA',
      bullets: [
        'Partnered with researchers to refresh lesson planner UI for 40k teachers.',
        'Built a component library to speed up QA and reduce defects by 22%.',
      ],
    },
  ],
  education: [
    {
      school: 'University of Washington',
      program: 'B.S. Human-Centered Design',
      start: '2014',
      end: '2018',
      details: 'Graduated with honors · UX capstone award',
    },
  ],
  projects: [
    {
      name: 'Atlas Growth Dashboard',
      link: 'atlas.app',
      description: 'Analytics suite for go-to-market teams.',
      bullets: ['Defined reporting taxonomy across product, sales, and marketing.'],
    },
  ],
  certifications: [{ name: 'NN/g UX Certificate', issuer: 'Nielsen Norman Group', year: '2022' }],
  extras: {
    languages: ['English', 'Spanish'],
    interests: ['Travel photography', 'Community hackathons'],
  },
  sectionOrder: [
    'summary',
    'skills',
    'experience',
    'education',
    'projects',
    'certifications',
    'extras',
  ],
  sectionVisibility: {
    summary: true,
    skills: true,
    experience: true,
    education: true,
    projects: true,
    certifications: true,
    extras: true,
  },
};

const hasText = (value?: string | null) => Boolean(value?.trim());

export const hasAnyUserData = (draft?: Partial<CvDraft>) => {
  if (!draft) return false;
  const basics: Partial<CvDraft['basics']> = draft.basics ?? {};

  if (
    hasText(basics.name) ||
    hasText(basics.headline) ||
    hasText(basics.email) ||
    hasText(basics.phone) ||
    hasText(basics.location) ||
    basics.links?.some(
      (link: { label?: string; url?: string }) => hasText(link?.label) || hasText(link?.url)
    )
  ) {
    return true;
  }

  if (hasText(draft.summary)) return true;
  if (draft.skills?.some((skill) => hasText(skill))) return true;

  if (
    draft.experience?.some(
      (exp) =>
        hasText(exp.company) ||
        hasText(exp.role) ||
        hasText(exp.location) ||
        hasText(exp.start) ||
        hasText(exp.end) ||
        exp.bullets?.some((bullet) => hasText(bullet))
    )
  ) {
    return true;
  }

  if (
    draft.education?.some(
      (edu) =>
        hasText(edu.school) ||
        hasText(edu.program) ||
        hasText(edu.start) ||
        hasText(edu.end) ||
        hasText(edu.details)
    )
  ) {
    return true;
  }

  if (
    draft.projects?.some(
      (project) =>
        hasText(project.name) ||
        hasText(project.link) ||
        hasText(project.description) ||
        project.bullets?.some((bullet) => hasText(bullet))
    )
  ) {
    return true;
  }

  if (
    draft.certifications?.some(
      (cert) => hasText(cert.name) || hasText(cert.issuer) || hasText(cert.year)
    )
  ) {
    return true;
  }

  if (draft.extras?.languages?.some((language) => hasText(language))) return true;
  if (draft.extras?.interests?.some((interest) => hasText(interest))) return true;

  return false;
};

export const resolvePreviewDraft = (draft: CvDraft): { draft: CvDraft; resumeSource: 'demo' | 'live' } => {
  const hasContent = hasAnyUserData(draft);
  const previewDraft = hasContent
    ? draft
    : {
        ...demoResume,
        templateId: draft.templateId || demoResume.templateId,
        title: draft.title || demoResume.title,
      };

  return {
    draft: previewDraft,
    resumeSource: hasContent ? 'live' : 'demo',
  };
};
