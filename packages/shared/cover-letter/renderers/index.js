import {
  renderCleanModernHeaderHtml,
  renderDarkHeaderCorporateHtml,
  renderMinimalWideNameHeaderHtml,
  renderPlainReSubjectHtml,
  renderPremiumElegantBusinessHtml,
  renderProfessionalBlueLetterheadHtml,
  renderSimpleEverydayFormalHtml,
  templateMarkersById,
} from './templates/renderers.js';

export { templateMarkersById };

export const renderersById = {
  'professional-blue-letterhead': renderProfessionalBlueLetterheadHtml,
  'clean-modern-header': renderCleanModernHeaderHtml,
  'dark-header-corporate': renderDarkHeaderCorporateHtml,
  'minimal-wide-name-header': renderMinimalWideNameHeaderHtml,
  'plain-re-subject': renderPlainReSubjectHtml,
  'simple-everyday-formal': renderSimpleEverydayFormalHtml,
  'premium-elegant-business': renderPremiumElegantBusinessHtml,
};

export function renderCoverLetterHtmlByTemplate(draft = {}) {
  const templateId = String(draft.templateId || '').trim();
  const renderer = renderersById[templateId];
  if (!renderer) {
    throw new Error(`No cover-letter HTML renderer for templateId=${templateId || 'unknown'}`);
  }
  return renderer(draft);
}
