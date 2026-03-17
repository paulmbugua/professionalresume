import type { CvDraft } from '@cvpro/shared/types';

export function resolveDraftStyles(draft: CvDraft) {
  const typography = draft.typography || {
    baseFontSize: 11,
    h1Size: 26,
    h2Size: 13,
    h3Size: 12,
    bodySize: 11,
    fontFamily: 'Inter,system-ui,Arial',
  };

  const formatting = draft.formatting || {
    textColor: '#0f172a',
    mutedTextColor: '#475569',
    linkColor: '#0f766e',
  };

  const theme = draft.templateTheme || { primary: '#0f172a', accent: '#0f766e' };

  const cssVars = {
    '--baseFontSize': `${typography.baseFontSize || 12}px`,
    '--h1Size': `${typography.h1Size || 28}px`,
    '--h2Size': `${typography.h2Size || 12}px`,
    '--h3Size': `${typography.h3Size || 11}px`,
    '--bodySize': `${typography.bodySize || typography.baseFontSize || 11}px`,
    '--fontFamily': typography.fontFamily || 'Inter,system-ui,Arial',
    '--textColor': formatting.textColor || '#0f172a',
    '--mutedTextColor': formatting.mutedTextColor || '#475569',
    '--linkColor': formatting.linkColor || '#0f766e',
    '--primary': theme.primary || '#0f172a',
    '--secondary': theme.secondary || '#1e293b',
    '--accent': theme.accent || theme.primary || '#0f766e',
    '--headerBg': theme.headerBg || theme.primary || '#0f172a',
    '--headerText': theme.headerText || '#ffffff',
    '--sidebarBg': theme.sidebarBg || theme.primary || '#0f172a',
    '--sidebarText': theme.sidebarText || '#f8fafc',
    '--sectionBg': theme.sectionBg || '#f8fafc',
    '--borderColor': theme.borderColor || '#e2e8f0',
  } as Record<string, string>;

  const cssVarBlock = `:root{${Object.entries(cssVars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')}}`;

  return { typography, formatting, theme, cssVars, cssVarBlock };
}
