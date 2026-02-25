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

const hasText = (value?: string | null) => Boolean(value && value.trim().length > 0);

const hasAnyNonEmptyBullet = (arr?: Array<string | null | undefined>) =>
  Boolean(arr?.some((v) => hasText(v)));

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

/**
 * Overlay rules:
 * - Strings: take user value only if non-empty, otherwise keep demo/base value.
 * - Arrays: if user has at least one meaningful item, take user array, otherwise keep demo/base.
 *
 * IMPORTANT for typing: these helpers MUST return non-optional fields (CvDraft has required strings).
 */
const overlayString = (demoVal: string, userVal?: string | null) =>
  hasText(userVal) ? userVal!.trim() : demoVal;

const overlayLinks = (
  demoLinks: CvDraft['basics']['links'],
  userLinks?: CvDraft['basics']['links']
): CvDraft['basics']['links'] => {
  const userHasAny = userLinks?.some((l) => hasText(l?.label) || hasText(l?.url)) ?? false;
  return userHasAny ? (userLinks as CvDraft['basics']['links']) : demoLinks;
};

const overlaySkills = (demoSkills: string[], userSkills?: string[]): string[] => {
  const userHasAny = userSkills?.some((s) => hasText(s)) ?? false;
  return userHasAny ? (userSkills as string[]) : demoSkills;
};

const overlayExperience = (
  demoExp: CvDraft['experience'],
  userExp?: CvDraft['experience']
): CvDraft['experience'] => {
  const userHasAny =
    userExp?.some(
      (e) =>
        hasText(e.company) ||
        hasText(e.role) ||
        hasText(e.location) ||
        hasText(e.start) ||
        hasText(e.end) ||
        hasAnyNonEmptyBullet(e.bullets)
    ) ?? false;

  return userHasAny ? (userExp as CvDraft['experience']) : demoExp;
};

const overlayEducation = (
  demoEdu: CvDraft['education'],
  userEdu?: CvDraft['education']
): CvDraft['education'] => {
  const userHasAny =
    userEdu?.some(
      (e) =>
        hasText(e.school) ||
        hasText(e.program) ||
        hasText(e.start) ||
        hasText(e.end) ||
        hasText(e.details)
    ) ?? false;

  return userHasAny ? (userEdu as CvDraft['education']) : demoEdu;
};

const overlayProjects = (
  demoProj: CvDraft['projects'],
  userProj?: CvDraft['projects']
): CvDraft['projects'] => {
  const userHasAny =
    userProj?.some(
      (p) =>
        hasText(p.name) ||
        hasText(p.link) ||
        hasText(p.description) ||
        hasAnyNonEmptyBullet(p.bullets)
    ) ?? false;

  return userHasAny ? (userProj as CvDraft['projects']) : demoProj;
};

const overlayCerts = (
  demoCerts: CvDraft['certifications'],
  userCerts?: CvDraft['certifications']
): CvDraft['certifications'] => {
  const userHasAny =
    userCerts?.some((c) => hasText(c.name) || hasText(c.issuer) || hasText(c.year)) ?? false;

  return userHasAny ? (userCerts as CvDraft['certifications']) : demoCerts;
};

const overlayExtras = (
  demoExtras: CvDraft['extras'],
  userExtras?: CvDraft['extras']
): CvDraft['extras'] => {
  const userHasLang = userExtras?.languages?.some((l) => hasText(l)) ?? false;
  const userHasInt = userExtras?.interests?.some((i) => hasText(i)) ?? false;

  return {
    ...demoExtras,
    ...(userExtras ?? {}),
    languages: userHasLang ? userExtras!.languages : demoExtras.languages,
    interests: userHasInt ? userExtras!.interests : demoExtras.interests,
  };
};

export const resolvePreviewDraft = (
  draft: Partial<CvDraft> | undefined
): { draft: CvDraft; resumeSource: 'demo' | 'live' } => {
  const templateId = draft?.templateId ?? demoResume.templateId;

  // base demo (template-aware if later you add per-template demo payloads)
  const base: CvDraft = { ...demoResume, templateId };

  // If no draft yet, pure demo
  if (!draft) return { draft: base, resumeSource: 'demo' };

  const hasUser = hasAnyUserData(draft);

  const merged: CvDraft = {
    ...base,

    // keep real identity fields from draft if present
    id: (draft.id as CvDraft['id']) ?? base.id,
    userId: (draft.userId as CvDraft['userId']) ?? base.userId,
    updatedAt: (draft.updatedAt as CvDraft['updatedAt']) ?? base.updatedAt,

    title: overlayString(base.title, draft.title),
    templateId,

    basics: {
      ...base.basics,
      ...(draft.basics ?? {}),
      name: overlayString(base.basics.name, draft.basics?.name),
      headline: overlayString(base.basics.headline, draft.basics?.headline),
      email: overlayString(base.basics.email, draft.basics?.email),
      phone: overlayString(base.basics.phone, draft.basics?.phone),
      location: overlayString(base.basics.location, draft.basics?.location),
      links: overlayLinks(base.basics.links, draft.basics?.links),
    },

    summary: overlayString(base.summary, draft.summary),

    skills: overlaySkills(base.skills ?? [], draft.skills),

    experience: overlayExperience(base.experience ?? [], draft.experience),
    education: overlayEducation(base.education ?? [], draft.education),
    projects: overlayProjects(base.projects ?? [], draft.projects),
    certifications: overlayCerts(base.certifications ?? [], draft.certifications),

    extras: overlayExtras(base.extras, draft.extras),

    // Always reflect user layout config (even if no text yet)
    sectionOrder: (draft.sectionOrder as CvDraft['sectionOrder']) ?? base.sectionOrder,
    sectionVisibility:
      (draft.sectionVisibility as CvDraft['sectionVisibility']) ?? base.sectionVisibility,
  };

  return { draft: merged, resumeSource: hasUser ? 'live' : 'demo' };
};