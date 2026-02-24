import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';

export const defaultSectionOrder: CvSectionKey[] = [
  'summary',
  'skills',
  'experience',
  'education',
  'projects',
  'certifications',
  'extras',
];

export const defaultSectionVisibility = defaultSectionOrder.reduce(
  (acc, key) => {
    acc[key] = true;
    return acc;
  },
  {} as Record<CvSectionKey, boolean>
);

export function normalizeDraft(draft: CvDraft): CvDraft {
  return {
    ...draft,
    sectionOrder: draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder,
    sectionVisibility: {
      ...defaultSectionVisibility,
      ...(draft.sectionVisibility || {}),
    },
    basics: {
      name: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      links: [],
      ...draft.basics,
    },
    skills: draft.skills || [],
    experience: draft.experience || [],
    education: draft.education || [],
    projects: draft.projects || [],
    certifications: draft.certifications || [],
    extras: {
      languages: [],
      interests: [],
      ...draft.extras,
    },
  };
}
