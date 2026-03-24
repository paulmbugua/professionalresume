import type { CvDraft, CvDraftMeta } from '@cvpro/shared/types';

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

const DEMO_META: CvDraftMeta = {
  isDemoSeeded: true,
  hasImportedCv: false,
};

const hasText = (value?: string | null) => Boolean(value && value.trim().length > 0);
const capString = (value: string | undefined | null, fallback = '') =>
  hasText(value) ? String(value).trim() : fallback;

export const hasAnyUserData = (draft?: Partial<CvDraft>) => {
  if (!draft) return false;

  const basics: Partial<CvDraft['basics']> = draft.basics ?? {};
  if (
    hasText(basics.name) ||
    hasText(basics.headline) ||
    hasText(basics.email) ||
    hasText(basics.phone) ||
    hasText(basics.location) ||
    basics.links?.some((l) => hasText(l?.label) || hasText(l?.url))
  ) {
    return true;
  }

  if (hasText(draft.summary)) return true;
  if (draft.skills?.some((s) => hasText(s))) return true;
  if (
    draft.experience?.some(
      (e) =>
        hasText(e.company) ||
        hasText(e.role) ||
        hasText(e.location) ||
        hasText(e.start) ||
        hasText(e.end) ||
        hasText(e.description) ||
        e.bullets?.some((b) => hasText(b))
    )
  ) {
    return true;
  }

  if (
    draft.education?.some(
      (e) =>
        hasText(e.school) ||
        hasText(e.program) ||
        hasText(e.start) ||
        hasText(e.end) ||
        hasText(e.details)
    )
  ) {
    return true;
  }

  if (
    draft.projects?.some(
      (p) =>
        hasText(p.name) ||
        hasText(p.link) ||
        hasText(p.description) ||
        p.bullets?.some((b) => hasText(b))
    )
  ) {
    return true;
  }

  if (draft.certifications?.some((c) => hasText(c.name) || hasText(c.issuer) || hasText(c.year))) {
    return true;
  }

  if (draft.extras?.languages?.some((l) => hasText(l))) return true;
  if (draft.extras?.interests?.some((i) => hasText(i))) return true;

  return false;
};

const isDraftMarkedDemoSeeded = (draft?: Partial<CvDraft>) => Boolean(draft?.meta?.isDemoSeeded);

const hasImportedOrMeaningfulContent = (draft?: Partial<CvDraft>) => {
  if (!draft) return false;
  if (draft.meta?.hasImportedCv) return true;
  return hasAnyUserData(draft);
};

export const getDraftSource = (draft?: Partial<CvDraft>): 'demo' | 'live' | 'saved' => {
  if (!draft) return 'demo';
  const hasMeaningfulContent = hasImportedOrMeaningfulContent(draft);
  const isDemoSeeded = isDraftMarkedDemoSeeded(draft);
  const isPersistedDraft = Boolean(draft.id && draft.id !== 'demo-cv');

  if (isPersistedDraft && hasMeaningfulContent) return 'saved';
  if (hasMeaningfulContent && !isDemoSeeded) return isPersistedDraft ? 'saved' : 'live';
  if (isDemoSeeded) return 'demo';
  return isPersistedDraft ? 'saved' : 'live';
};

const resolveSectionArray = <T>(demoValue: T[], userValue?: T[], preferDraft = false): T[] => {
  if (preferDraft) return userValue ?? [];
  return Array.isArray(userValue) && userValue.length > 0 ? (userValue as T[]) : demoValue;
};

export const resolvePreviewDraft = (
  draft: Partial<CvDraft> | undefined
): { draft: CvDraft; resumeSource: 'demo' | 'live' | 'saved' } => {
  const templateId = draft?.templateId ?? demoResume.templateId;
  const base: CvDraft = { ...demoResume, templateId };

  if (!draft) return { draft: { ...base, meta: DEMO_META }, resumeSource: 'demo' };

  const resumeSource = getDraftSource(draft);
  const preferDraftValues = resumeSource !== 'demo';

  const merged: CvDraft = {
    ...base,
    id: (draft.id as CvDraft['id']) ?? base.id,
    userId: (draft.userId as CvDraft['userId']) ?? base.userId,
    updatedAt: (draft.updatedAt as CvDraft['updatedAt']) ?? base.updatedAt,
    title: preferDraftValues ? capString(draft.title) : capString(draft.title, base.title),
    templateId,
    basics: {
      ...base.basics,
      ...(draft.basics ?? {}),
      name: preferDraftValues
        ? capString(draft.basics?.name)
        : capString(draft.basics?.name, base.basics.name),
      headline: preferDraftValues
        ? capString(draft.basics?.headline)
        : capString(draft.basics?.headline, base.basics.headline),
      email: preferDraftValues
        ? capString(draft.basics?.email)
        : capString(draft.basics?.email, base.basics.email),
      phone: preferDraftValues
        ? capString(draft.basics?.phone)
        : capString(draft.basics?.phone, base.basics.phone),
      location: preferDraftValues
        ? capString(draft.basics?.location)
        : capString(draft.basics?.location, base.basics.location),
      links: preferDraftValues
        ? ((draft.basics?.links ?? []) as CvDraft['basics']['links'])
        : resolveSectionArray(base.basics.links, draft.basics?.links),
    },
    summary: preferDraftValues ? capString(draft.summary) : capString(draft.summary, base.summary),
    skills: resolveSectionArray(base.skills, draft.skills, preferDraftValues),
    experience: resolveSectionArray(base.experience, draft.experience, preferDraftValues),
    education: resolveSectionArray(base.education, draft.education, preferDraftValues),
    projects: resolveSectionArray(base.projects, draft.projects, preferDraftValues),
    certifications: resolveSectionArray(
      base.certifications,
      draft.certifications,
      preferDraftValues
    ),
    extras: preferDraftValues
      ? {
          languages: draft.extras?.languages ?? [],
          interests: draft.extras?.interests ?? [],
        }
      : {
          ...base.extras,
          ...(draft.extras ?? {}),
          languages:
            draft.extras?.languages && draft.extras.languages.length > 0
              ? draft.extras.languages
              : base.extras.languages,
          interests:
            draft.extras?.interests && draft.extras.interests.length > 0
              ? draft.extras.interests
              : base.extras.interests,
        },
    sectionOrder: (draft.sectionOrder as CvDraft['sectionOrder']) ?? base.sectionOrder,
    sectionVisibility:
      (draft.sectionVisibility as CvDraft['sectionVisibility']) ?? base.sectionVisibility,
    typography: (draft.typography as CvDraft['typography']) ?? base.typography,
    formatting: (draft.formatting as CvDraft['formatting']) ?? base.formatting,
    templateTheme: (draft.templateTheme as CvDraft['templateTheme']) ?? base.templateTheme,
    richText: (draft.richText as CvDraft['richText']) ?? base.richText,
    meta: {
      ...DEMO_META,
      ...(draft.meta || {}),
      isDemoSeeded: isDraftMarkedDemoSeeded(draft),
    },
  };

  return { draft: merged, resumeSource };
};
