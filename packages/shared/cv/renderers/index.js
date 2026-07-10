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
  templateMarkersById,
} from './templates/renderers.js';

export { normalizeCvDraft, sanitizeRichTextHtml, buildCssVars, paginationCss, resolveTemplateTypography, templateMarkersById, buildCvFontFaceCss, getTemplateFontStack, getTemplateFontDependencies, getTemplateFontAudit };

export const renderersById = {
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
};

export function renderCvHtmlByTemplate(draft = {}) {
  const normalized = normalizeCvDraft(draft);
  const templateId = normalized.templateId || normalized.template_key;
  const renderer = renderersById[templateId];
  if (!renderer) throw new Error(`No HTML renderer for templateId=${templateId || 'unknown'}`);
  return renderer(normalized);
}
