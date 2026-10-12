const sidebarIds = new Set([
  'modern-sidebar',
  'modern-sidebar-blue',
  'impact-sidebar',
  'executive-navy-orange',
]);
const columnLayouts = {
  'modern-teal': {
    layout: 'two-column',
    sidebarSections: ['summary', 'skills', 'education', 'extras'],
    mainSections: ['experience', 'projects', 'certifications', 'additionalSections'],
  },
  'clinical-clean': {
    layout: 'two-column',
    sidebarSections: ['summary', 'certifications', 'skills'],
    mainSections: ['experience', 'education', 'projects', 'extras', 'additionalSections'],
  },
  'executive-band': {
    layout: 'main-sidebar',
    sidebarSections: ['skills', 'education', 'certifications', 'extras'],
    mainSections: ['experience', 'projects', 'additionalSections'],
    headerSections: ['summary'],
  },
  'nairobi-grid': {
    layout: 'two-column',
    sidebarSections: [],
    mainSections: [
      'experience',
      'projects',
      'education',
      'certifications',
      'extras',
      'additionalSections',
    ],
    headerSections: ['summary', 'skills'],
  },
};

export function getResumeTemplateMetadata(templateId) {
  const sidebar = sidebarIds.has(templateId);
  return {
    templateId,
    layout: sidebar ? 'sidebar-main' : 'single-column',
    sidebarSections: sidebar ? ['summary', 'skills', 'certifications', 'extras'] : [],
    mainSections: sidebar
      ? ['experience', 'projects', 'education', 'additionalSections']
      : [
          'summary',
          'skills',
          'experience',
          'projects',
          'education',
          'certifications',
          'extras',
          'additionalSections',
        ],
    preferredPages: templateId === 'compact-one-pager' ? 1 : 2,
    density: /compact|one-pager/.test(templateId) ? 'compact' : 'balanced',
    summaryWordLimit: sidebar ? 75 : 110,
    maxBulletsPerRole: /compact|one-pager/.test(templateId) ? 4 : 6,
    pageSize: 'A4',
    pagination: {
      mode: 'continuous-flow',
      targetUtilizationPercent: [85, 95],
      minimumFinalPageUtilizationPercent: 35,
      bottomSafeAreaMm: 8,
      splitLongExperienceEntries: true,
      keepCompactEntriesTogether: true,
      neverAssignPagesBySection: true,
    },
    ...(columnLayouts[templateId] || {}),
    ...(templateId === 'modern-teal' || templateId === 'clinical-clean'
      ? { summaryWordLimit: 75 }
      : {}),
  };
}
