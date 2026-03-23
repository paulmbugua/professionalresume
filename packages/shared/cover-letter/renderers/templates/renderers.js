import {
  normalizeCoverLetterRenderModel,
  normalizeCoverLetterTemplateId,
} from '../renderModel.js';

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function toneVars(pageTheme) {
  if (pageTheme === 'dark') {
    return {
      pageBg: '#0f172a',
      paperBg: '#ffffff',
      textColor: '#0f172a',
      mutedColor: '#475569',
      dividerColor: 'rgba(15,23,42,.18)',
    };
  }

  if (pageTheme === 'warm') {
    return {
      pageBg: '#f8f4ea',
      paperBg: '#fffdf8',
      textColor: '#3f2d1f',
      mutedColor: '#6e5843',
      dividerColor: 'rgba(110,88,67,.35)',
    };
  }

  return {
    pageBg: '#eef2ff',
    paperBg: '#fff',
    textColor: '#0f172a',
    mutedColor: '#475569',
    dividerColor: 'rgba(15,23,42,.16)',
  };
}

function hexToRgb(hex) {
  const normalized = String(hex || '').trim().replace('#', '');
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(normalized)) return null;
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((part) => `${part}${part}`)
          .join('')
      : normalized;
  const value = parseInt(full, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function pickHeaderForeground(accent) {
  const rgb = hexToRgb(accent);
  if (!rgb) return { headerText: '#f8fafc', headerMuted: '#dbeafe', headerDivider: 'rgba(248,250,252,.32)' };
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  if (yiq >= 150) {
    return { headerText: '#0f172a', headerMuted: '#334155', headerDivider: 'rgba(15,23,42,.28)' };
  }
  return { headerText: '#f8fafc', headerMuted: '#dbeafe', headerDivider: 'rgba(248,250,252,.32)' };
}

function buildTemplateColorVars(model) {
  const tones = toneVars(model.style.pageTheme);
  const header = pickHeaderForeground(model.style.accentColor);
  return {
    ...tones,
    bodyText: tones.textColor,
    headingText: tones.textColor,
    headerText: header.headerText,
    headerMuted: header.headerMuted,
    headerDivider: header.headerDivider,
  };
}

function metaLines(c) {
  return [c.applicantEmail, c.applicantPhone, c.applicantLocation].filter(Boolean).map(esc).join(' · ');
}

function recipientBlock(c) {
  const rows = [c.recipientName, c.recipientTitle, c.companyName, c.companyAddress].filter(Boolean);
  if (!rows.length) {
    return '<p class="cl-placeholder">Recipient details (name, title, company, address)</p>';
  }
  return `<p>${rows.map((row) => esc(row)).join('<br/>')}</p>`;
}

function bodyBlock(c) {
  const paragraphs = [c.opening, ...c.paragraphs, c.closingParagraph].filter(Boolean);
  if (!paragraphs.length) {
    return '<div class="cl-body"><p class="cl-placeholder">Write 2–4 concise paragraphs that connect your results to the role.</p></div>';
  }

  return `<div class="cl-body">${paragraphs
    .map((line) => `<p>${esc(line)}</p>`)
    .join('')}</div>`;
}

function doc(model, body, css, markerClass) {
  const vars = buildTemplateColorVars(model);
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>
@page{size:A4;margin:0}
html,body{margin:0;padding:0;background:var(--cl-page-bg);color:var(--cl-text);-webkit-print-color-adjust:exact;print-color-adjust:exact}
*{box-sizing:border-box}
body{font-family:var(--cl-font-family);line-height:var(--cl-line-height);font-size:var(--cl-font-size);word-break:break-word;overflow-wrap:anywhere;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cl-page{width:210mm;min-height:297mm;margin:0 auto;background:var(--cl-paper-bg);color:var(--cl-text);padding:18mm 17mm 18mm 17mm;position:relative;overflow:hidden}
.cl-content{max-width:176mm}
.cl-header-name{color:var(--cl-heading)}
.cl-header-title,.cl-date,.cl-meta,.cl-subject,.cl-recipient{font-size:calc(var(--cl-font-size) - 1px);color:var(--cl-muted)}
.cl-recipient,.cl-greeting,.cl-body,.cl-closing{margin-top:5mm;color:var(--cl-body-text)}
.cl-body p{margin:0 0 calc(var(--cl-line-height) * 2.5mm) 0}
.cl-signature{margin-top:2mm;font-weight:600}
.cl-placeholder{color:#94a3b8;font-style:italic}
.cl-header-name{margin:0;font-size:30px;line-height:1.05;font-weight:700;letter-spacing:.01em}
.cl-header-title{margin:2mm 0 0;font-size:14px}
.cl-divider{height:1px;background:var(--cl-divider-color);margin:5mm 0 0}
@media print{html,body,*{-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{background:var(--cl-paper-bg)}.cl-page{margin:0;box-shadow:none;break-inside:avoid-page;page-break-inside:avoid}}
:root{
  --cl-font-family:${esc(model.style.fontFamily)};
  --cl-font-size:${model.style.fontSize}px;
  --cl-line-height:${model.style.lineHeight};
  --cl-accent:${esc(model.style.accentColor)};
  --cl-page-bg:${vars.pageBg};
  --cl-paper-bg:${vars.paperBg};
  --cl-text:${vars.textColor};
  --cl-heading:${vars.headingText};
  --cl-body-text:${vars.bodyText};
  --cl-muted:${vars.mutedColor};
  --cl-header-text:${vars.headerText};
  --cl-header-muted:${vars.headerMuted};
  --cl-header-divider:${vars.headerDivider};
  --cl-divider-color:${vars.dividerColor};
}
${css}
</style></head><body data-template-id="${esc(model.templateId)}"><main class="cl-page ${markerClass}">${body}</main></body></html>`;
}

function renderCommon(model, extras = '') {
  const c = model.content;
  return `<div class="cl-content">
    <header class="cl-header">
      <h1 class="cl-header-name">${esc(c.applicantName || 'Your Name')}</h1>
      <p class="cl-header-title">${esc(c.applicantTitle || c.applicantHeadline || c.roleTitle || 'Professional Title')}</p>
      <p class="cl-meta">${metaLines(c) || '<span class="cl-placeholder">email · phone · location</span>'}</p>
    </header>
    ${extras}
    <p class="cl-date">${esc(c.dateText || c.date || 'Date')}</p>
    <section class="cl-recipient">${recipientBlock(c)}</section>
    ${(c.subjectLine || c.subject) ? `<p class="cl-subject"><strong>Re:</strong> ${esc(c.subjectLine || c.subject)}</p>` : ''}
    <p class="cl-greeting">${esc(c.greeting)}</p>
    ${bodyBlock(c)}
    <section class="cl-closing"><p>${esc(c.closingLine)}</p><p class="cl-signature">${esc(c.signatureName)}</p></section>
  </div>`;
}

export function renderClassicLetterHtml(draft = {}) {
  const model = normalizeCoverLetterRenderModel({ ...draft, templateId: 'classic-letter' });
  return doc(
    model,
    renderCommon(model),
    '.classicLetter{background:var(--cl-page-bg)}.classicLetter .cl-page,.classicLetter{font-family:Cambria,"Times New Roman",Georgia,serif}.classicLetter .cl-header-name{font-size:28px}.classicLetter .cl-header-title{font-size:13px;letter-spacing:.02em;text-transform:uppercase}',
    'classicLetter',
  );
}

export function renderProfessionalBlueLetterheadHtml(draft = {}) {
  const model = normalizeCoverLetterRenderModel({ ...draft, templateId: 'professional-blue-letterhead' });
  return doc(
    model,
    renderCommon(model, '<div class="cl-divider"></div>'),
    '.professionalBlueLetterhead{border-top:6mm solid var(--cl-accent)}.professionalBlueLetterhead .cl-header-title{color:var(--cl-accent)}.professionalBlueLetterhead .cl-divider{background:color-mix(in srgb, var(--cl-accent) 40%, transparent)}',
    'professionalBlueLetterhead',
  );
}

export function renderCleanModernHeaderHtml(draft = {}) {
  const model = normalizeCoverLetterRenderModel({ ...draft, templateId: 'clean-modern-header' });
  return doc(
    model,
    renderCommon(model),
    '.cleanModernHeader .cl-header{display:grid;grid-template-columns:1fr auto;gap:8mm;align-items:end}.cleanModernHeader .cl-meta{text-align:right}.cleanModernHeader .cl-header-name{color:var(--cl-accent)}',
    'cleanModernHeader',
  );
}

export function renderDarkHeaderCorporateHtml(draft = {}) {
  const model = normalizeCoverLetterRenderModel({ ...draft, templateId: 'dark-header-corporate' });
  const c = model.content;
  return doc(
    model,
    `<div class="cl-corporate-header"><h1 class="cl-header-name">${esc(c.applicantName || 'Your Name')}</h1><p class="cl-header-title">${esc(c.applicantTitle || c.applicantHeadline || c.roleTitle || 'Professional Title')}</p><p class="cl-meta">${metaLines(c) || '<span class="cl-placeholder">email · phone · location</span>'}</p></div>${renderCommon({ ...model, content: { ...c, applicantName: '', applicantHeadline: '' } })}`,
    '.darkHeaderCorporate{padding-top:0}.darkHeaderCorporate .cl-corporate-header{margin:0 -17mm 5mm;background:color-mix(in srgb, var(--cl-accent) 55%, #0f172a);color:var(--cl-header-text);padding:11mm 17mm}.darkHeaderCorporate .cl-corporate-header .cl-header-name{color:var(--cl-header-text)}.darkHeaderCorporate .cl-corporate-header .cl-header-title,.darkHeaderCorporate .cl-corporate-header .cl-meta{color:var(--cl-header-muted)}.darkHeaderCorporate .cl-corporate-header .cl-meta{padding-top:1.5mm;border-top:1px solid var(--cl-header-divider)}.darkHeaderCorporate .cl-header{display:none}',
    'darkHeaderCorporate',
  );
}

export function renderMinimalWideNameHeaderHtml(draft = {}) {
  const model = normalizeCoverLetterRenderModel({ ...draft, templateId: 'minimal-wide-name-header' });
  return doc(
    model,
    renderCommon(model),
    '.minimalWideNameHeader .cl-header-name{font-size:36px;letter-spacing:.06em;text-transform:uppercase;font-weight:500;color:var(--cl-accent)}',
    'minimalWideNameHeader',
  );
}

export function renderPlainReSubjectHtml(draft = {}) {
  const model = normalizeCoverLetterRenderModel({ ...draft, templateId: 'plain-re-subject' });
  return doc(
    model,
    renderCommon({ ...model, content: { ...model.content, subject: model.content.subject || 'Application for the advertised role' } }),
    '.plainReSubject .cl-page,.plainReSubject{font-family:Arial,Helvetica,sans-serif}.plainReSubject .cl-subject{font-weight:600;text-transform:none;color:var(--cl-accent)}',
    'plainReSubject',
  );
}

export function renderSimpleEverydayFormalHtml(draft = {}) {
  const model = normalizeCoverLetterRenderModel({ ...draft, templateId: 'simple-everyday-formal' });
  return doc(
    model,
    renderCommon(model),
    '.simpleEverydayFormal .cl-page,.simpleEverydayFormal{font-family:Calibri,"Segoe UI",Arial,sans-serif}.simpleEverydayFormal .cl-header-title{font-size:13px}',
    'simpleEverydayFormal',
  );
}

export function renderPremiumElegantBusinessHtml(draft = {}) {
  const model = normalizeCoverLetterRenderModel({ ...draft, templateId: 'premium-elegant-business' });
  return doc(
    model,
    renderCommon(model, '<div class="cl-elegant-rule"></div>'),
    '.premiumElegantBusiness .cl-page,.premiumElegantBusiness{font-family:Georgia,"Times New Roman",serif}.premiumElegantBusiness .cl-elegant-rule{height:2px;background:linear-gradient(90deg,var(--cl-accent),color-mix(in srgb, var(--cl-accent) 35%, #fff));margin:4mm 0 0}.premiumElegantBusiness .cl-header-title{letter-spacing:.03em;text-transform:uppercase;font-size:12px}',
    'premiumElegantBusiness',
  );
}

export const templateMarkersById = {
  'classic-letter': ['data-template-id="classic-letter"', 'classicLetter'],
  'professional-blue-letterhead': [
    'data-template-id="professional-blue-letterhead"',
    'professionalBlueLetterhead',
  ],
  'clean-modern-header': ['data-template-id="clean-modern-header"', 'cleanModernHeader'],
  'dark-header-corporate': ['data-template-id="dark-header-corporate"', 'darkHeaderCorporate'],
  'minimal-wide-name-header': [
    'data-template-id="minimal-wide-name-header"',
    'minimalWideNameHeader',
  ],
  'plain-re-subject': ['data-template-id="plain-re-subject"', 'plainReSubject'],
  'simple-everyday-formal': ['data-template-id="simple-everyday-formal"', 'simpleEverydayFormal'],
  'premium-elegant-business': [
    'data-template-id="premium-elegant-business"',
    'premiumElegantBusiness',
  ],
};

export { normalizeCoverLetterTemplateId };
