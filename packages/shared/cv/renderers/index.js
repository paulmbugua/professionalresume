import {
  buildCssVars,
  normalizeCvDraft,
  paginationCss,
  resolveTemplateTypography,
  sanitizeRichTextHtml,
} from './templates/helpers.js';
import {
  buildCvFontFaceCss,
  getTemplateFontAudit,
  getTemplateFontDependencies,
  getTemplateFontStack,
} from './templates/fonts.js';
import {
  renderAtsCompactHtml,
  renderAtsMinimalHtml,
  renderBoldHeaderHtml,
  renderCompactOnePagerHtml,
  renderCreativeTimelineHtml,
  renderElegantSerifHtml,
  renderExecutiveBandHtml,
  renderSkillMatrixHtml,
  renderAcademicCompactHtml,
  renderProjectForwardHtml,
  renderOperationsLedgerHtml,
  renderModernSidebarBlueHtml,
  renderModernSidebarHtml,
  renderModernTealHtml,
  templateMarkersById as baseTemplateMarkersById,
} from './templates/renderers.js';
import {
  newTemplateMarkersById,
  renderAnalystDashboardHtml,
  renderClinicalCleanHtml,
  renderDiplomaticClassicHtml,
  renderImpactSidebarHtml,
  renderLegalFormalHtml,
  renderNairobiGridHtml,
  renderPortfolioCanvasHtml,
  renderServiceProHtml,
} from './templates/newRenderers.js';
import {
  buildSmartPaginationScript,
  injectSmartPagination,
  smartPaginationCss,
} from './smartPagination.js';

export {
  normalizeCvDraft,
  sanitizeRichTextHtml,
  buildCssVars,
  paginationCss,
  resolveTemplateTypography,
  buildCvFontFaceCss,
  getTemplateFontStack,
  getTemplateFontDependencies,
  getTemplateFontAudit,
  buildSmartPaginationScript,
  injectSmartPagination,
  smartPaginationCss,
};

export const templateMarkersById = {
  'executive-navy-orange': ['modernSidebarLayout'],
  ...baseTemplateMarkersById,
  ...newTemplateMarkersById,
};

export const renderersById = {
  'executive-navy-orange': (draft) => renderModernSidebarHtml({ ...draft, templateId: 'executive-navy-orange' }).replace('</head>', '<style>.sidebar h2{color:var(--accent)}.content h2{border-bottom:2px solid var(--accent);padding-bottom:5px}.sidebar .headline{color:#fff}</style></head>'),
  'ats-minimal': renderAtsMinimalHtml,
  'ats-compact': renderAtsCompactHtml,
  'modern-teal': renderModernTealHtml,
  'modern-sidebar-blue': renderModernSidebarBlueHtml,
  'bold-header': renderBoldHeaderHtml,
  'modern-sidebar': renderModernSidebarHtml,
  'elegant-serif': renderElegantSerifHtml,
  'creative-timeline': renderCreativeTimelineHtml,
  'compact-one-pager': renderCompactOnePagerHtml,
  'executive-band': renderExecutiveBandHtml,
  'skill-matrix': renderSkillMatrixHtml,
  'academic-compact': renderAcademicCompactHtml,
  'project-forward': renderProjectForwardHtml,
  'operations-ledger': renderOperationsLedgerHtml,
  'nairobi-grid': renderNairobiGridHtml,
  'diplomatic-classic': renderDiplomaticClassicHtml,
  'impact-sidebar': renderImpactSidebarHtml,
  'analyst-dashboard': renderAnalystDashboardHtml,
  'service-pro': renderServiceProHtml,
  'legal-formal': renderLegalFormalHtml,
  'clinical-clean': renderClinicalCleanHtml,
  'portfolio-canvas': renderPortfolioCanvasHtml,
};

export function renderCvHtmlByTemplate(draft = {}) {
  const normalized = normalizeCvDraft(draft);
  const templateId = normalized.templateId || normalized.template_key;
  const renderer = renderersById[templateId];
  if (!renderer) throw new Error(`No HTML renderer for templateId=${templateId || 'unknown'}`);
  return renderer(normalized);
}
