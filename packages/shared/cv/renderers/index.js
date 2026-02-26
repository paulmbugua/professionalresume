import {
  buildCssVars,
  normalizeCvDraft,
  paginationCss,
  sanitizeRichTextHtml,
} from './templates/helpers.js';
import {
  renderAtsCompactHtml,
  renderAtsMinimalHtml,
  renderBoldHeaderHtml,
  renderCompactOnePagerHtml,
  renderCreativeTimelineHtml,
  renderElegantSerifHtml,
  renderModernSidebarBlueHtml,
  renderModernSidebarHtml,
  renderModernTealHtml,
  templateMarkersById,
} from './templates/renderers.js';

export { normalizeCvDraft, sanitizeRichTextHtml, buildCssVars, paginationCss, templateMarkersById };

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
};

export function renderCvHtmlByTemplate(draft = {}) {
  const normalized = normalizeCvDraft(draft);
  const templateId = normalized.templateId || normalized.template_key;
  const renderer = renderersById[templateId];
  if (!renderer) throw new Error(`No HTML renderer for templateId=${templateId || 'unknown'}`);
  return renderer(normalized);
}
