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

const templateThemeDefaults: Record<string, Record<string, string>> = {
  'modern-sidebar': { primary: '#0f172a', sidebarBg: '#0f172a', sidebarText: '#f8fafc', accent: '#38bdf8' },
  'bold-header': { primary: '#0f172a', headerBg: '#0f172a', headerText: '#ffffff', accent: '#38bdf8' },
  'modern-teal': { primary: '#0f766e', accent: '#0d9488', sectionBg: '#f0fdfa' },
  'modern-sidebar-blue': { primary: '#1d4ed8', sidebarBg: '#1d4ed8', sidebarText: '#eff6ff', accent: '#93c5fd' },
};

export function normalizeDraft(draft: CvDraft): CvDraft {
  const templateDefaults = templateThemeDefaults[draft.templateId] || {};

  return {
    ...draft,
    sectionOrder: draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder,
    sectionVisibility: {
      ...defaultSectionVisibility,
      ...(draft.sectionVisibility || {}),
    },
    basics: {
      ...(draft.basics || ({} as any)),
      name: draft.basics?.name || '',
      headline: draft.basics?.headline || '',
      email: draft.basics?.email || '',
      phone: draft.basics?.phone || '',
      location: draft.basics?.location || '',
      links: draft.basics?.links || [],
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
    typography: {
      baseFontSize: 12,
      h1Size: 28,
      h2Size: 12,
      h3Size: 11,
      bodySize: 11,
      fontFamily: 'Inter, system-ui, Arial',
      ...(draft.typography || {}),
    },
    formatting: {
      textColor: '#0f172a',
      mutedTextColor: '#475569',
      linkColor: '#0f766e',
      ...(draft.formatting || {}),
    },
    templateTheme: {
      primary: '#0f172a',
      ...templateDefaults,
      ...(draft.templateTheme || {}),
    },
    richText: {
      ...(draft.richText || {}),
    },
  };
}
