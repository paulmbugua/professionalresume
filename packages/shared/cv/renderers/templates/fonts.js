const FONT_FAMILIES = {
  inter: {
    family: 'Inter',
    localSources: [
      'Inter',
      'Inter Regular',
      'DejaVu Sans',
      'Liberation Sans',
      'Arial',
    ],
  },
  poppins: {
    family: 'Poppins',
    localSources: [
      'Poppins',
      'Inter',
      'DejaVu Sans',
      'Liberation Sans',
      'Arial',
    ],
  },
  sourceSans3: {
    family: 'Source Sans 3',
    localSources: [
      'Source Sans 3',
      'Source Sans Pro',
      'Inter',
      'DejaVu Sans',
      'Liberation Sans',
      'Arial',
    ],
  },
  elegantSerif: {
    family: 'Elegant Serif',
    localSources: [
      'Georgia',
      'Times New Roman',
      'DejaVu Serif',
      'Liberation Serif',
      'Times',
      'serif',
    ],
  },
};

const TEMPLATE_FONT_STACKS = {
  'ats-minimal': "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  'ats-compact': "'Source Sans 3', 'Inter', 'Segoe UI', Arial, sans-serif",
  'modern-sidebar': "'Inter', 'Segoe UI', Arial, sans-serif",
  'modern-sidebar-blue': "'Poppins', 'Inter', 'Segoe UI', Arial, sans-serif",
  'bold-header': "'Inter', 'Segoe UI', Arial, sans-serif",
  'modern-teal': "'Inter', 'Segoe UI', Arial, sans-serif",
  'elegant-serif': "'Elegant Serif', Georgia, 'Times New Roman', serif",
  'creative-timeline': "'Inter', 'Segoe UI', Arial, sans-serif",
  'compact-one-pager': "'Inter', 'Segoe UI', Arial, sans-serif",
  'executive-band': "'Inter', 'Segoe UI', Arial, sans-serif",
  'skill-matrix': "'Source Sans 3', 'Inter', 'Segoe UI', Arial, sans-serif",
  'academic-compact': "'Elegant Serif', Georgia, 'Times New Roman', serif",
  'project-forward': "'Inter', 'Segoe UI', Arial, sans-serif",
  'operations-ledger': "'Source Sans 3', 'Inter', 'Segoe UI', Arial, sans-serif",
};

const TEMPLATE_FONT_DEPENDENCIES = {
  'ats-minimal': [],
  'ats-compact': ['sourceSans3', 'inter'],
  'modern-sidebar': ['inter'],
  'modern-sidebar-blue': ['poppins', 'inter'],
  'bold-header': ['inter'],
  'modern-teal': ['inter'],
  'elegant-serif': ['elegantSerif'],
  'creative-timeline': ['inter'],
  'compact-one-pager': ['inter'],
  'executive-band': ['inter'],
  'skill-matrix': ['sourceSans3', 'inter'],
  'academic-compact': ['elegantSerif'],
  'project-forward': ['inter'],
  'operations-ledger': ['sourceSans3', 'inter'],
};

const ALL_CV_FONT_DEPENDENCIES = Array.from(
  new Set(Object.values(TEMPLATE_FONT_DEPENDENCIES).flat())
);

export function getTemplateFontStack(templateId = '') {
  return (
    TEMPLATE_FONT_STACKS[String(templateId || '').trim()] ||
    "'Inter', 'Segoe UI', Arial, sans-serif"
  );
}

export function getTemplateFontDependencies(templateId = '') {
  return TEMPLATE_FONT_DEPENDENCIES[String(templateId || '').trim()] || [];
}

export function getTemplateFontAudit() {
  return Object.keys(TEMPLATE_FONT_STACKS).map((templateId) => ({
    templateId,
    fontFamily: TEMPLATE_FONT_STACKS[templateId],
    dependencies: getTemplateFontDependencies(templateId),
  }));
}

export function buildCvFontFaceCss({ fontKeys = ALL_CV_FONT_DEPENDENCIES } = {}) {
  return fontKeys
    .flatMap((key) => {
      const family = FONT_FAMILIES[key];
      if (!family) return [];
      const src = family.localSources.map((source) => `local('${source}')`).join(',');
      return [`@font-face{font-family:'${family.family}';font-style:normal;font-weight:400 900;font-display:swap;src:${src};}`];
    })
    .join('');
}
