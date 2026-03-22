import {
  normalizeCoverLetterTemplateId,
  renderClassicLetterHtml,
  renderCleanModernHeaderHtml,
  renderDarkHeaderCorporateHtml,
  renderMinimalWideNameHeaderHtml,
  renderPlainReSubjectHtml,
  renderPremiumElegantBusinessHtml,
  renderProfessionalBlueLetterheadHtml,
  renderSimpleEverydayFormalHtml,
  templateMarkersById,
} from './templates/renderers.js';

export { normalizeCoverLetterTemplateId, templateMarkersById };

export const renderersById = {
  'classic-letter': renderClassicLetterHtml,
  'professional-blue-letterhead': renderProfessionalBlueLetterheadHtml,
  'clean-modern-header': renderCleanModernHeaderHtml,
  'dark-header-corporate': renderDarkHeaderCorporateHtml,
  'minimal-wide-name-header': renderMinimalWideNameHeaderHtml,
  'plain-re-subject': renderPlainReSubjectHtml,
  'simple-everyday-formal': renderSimpleEverydayFormalHtml,
  'premium-elegant-business': renderPremiumElegantBusinessHtml,
};

export function renderCoverLetterHtmlByTemplate(draft = {}) {
  const templateId = normalizeCoverLetterTemplateId(draft.templateId);
  const renderer = renderersById[templateId] || renderersById['classic-letter'];
  return renderer({ ...draft, templateId });
}
