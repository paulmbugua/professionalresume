const LETTER_IDS = [
  'professional-blue-letterhead',
  'clean-modern-header',
  'dark-header-corporate',
  'minimal-wide-name-header',
  'plain-re-subject',
  'simple-everyday-formal',
  'premium-elegant-business',
];

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function normalizeCoverLetterDraft(draft = {}) {
  return {
    templateId: LETTER_IDS.includes(String(draft.templateId || '').trim())
      ? String(draft.templateId || '').trim()
      : 'professional-blue-letterhead',
    senderName: String(draft.senderName || draft.basics?.name || '').trim(),
    senderTitle: String(draft.senderTitle || draft.basics?.headline || '').trim(),
    senderEmail: String(draft.senderEmail || draft.basics?.email || '').trim(),
    senderPhone: String(draft.senderPhone || draft.basics?.phone || '').trim(),
    senderLocation: String(draft.senderLocation || draft.basics?.location || '').trim(),
    date: String(draft.date || '').trim(),
    recipientName: String(draft.recipientName || '').trim(),
    recipientTitle: String(draft.recipientTitle || '').trim(),
    companyName: String(draft.companyName || '').trim(),
    companyAddress: String(draft.companyAddress || '').trim(),
    greeting: String(draft.greeting || '').trim() || 'Dear Hiring Manager,',
    subject: String(draft.subject || '').trim(),
    body: Array.isArray(draft.body)
      ? draft.body.map((line) => String(line || '').trim()).filter(Boolean)
      : String(draft.body || '')
          .split(/\n{2,}/)
          .map((line) => line.trim())
          .filter(Boolean),
    closing: String(draft.closing || '').trim() || 'Sincerely,',
    signatureName:
      String(draft.signatureName || draft.senderName || draft.basics?.name || '').trim() ||
      'Your Name',
  };
}

function metaLines(d) {
  return [d.senderEmail, d.senderPhone, d.senderLocation].filter(Boolean).map(esc).join(' · ');
}

function recipientBlock(d) {
  const rows = [d.recipientName, d.recipientTitle, d.companyName, d.companyAddress].filter(Boolean);
  if (!rows.length) {
    return '<p class="cl-placeholder">Recipient details (name, title, company, address)</p>';
  }
  return `<p>${rows.map((row) => esc(row)).join('<br/>')}</p>`;
}

function bodyBlock(d) {
  const paragraphs = d.body.length
    ? d.body.map((line) => `<p>${esc(line)}</p>`).join('')
    : '<p class="cl-placeholder">Write 2–4 concise paragraphs that connect your results to the role.</p>';
  return `<div class="cl-body">${paragraphs}</div>`;
}

function doc(d, body, css, markerClass) {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>
@page{size:A4;margin:0}
html,body{margin:0;padding:0;background:#eef2ff;color:#0f172a}
*{box-sizing:border-box}
body{font-family:Inter,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.55;word-break:break-word;overflow-wrap:anywhere}
.cl-page{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:18mm 17mm 18mm 17mm;position:relative;overflow:hidden}
.cl-content{max-width:176mm}
.cl-date,.cl-meta,.cl-subject{font-size:12px;color:#475569}
.cl-recipient,.cl-greeting,.cl-body,.cl-closing{margin-top:5mm}
.cl-body p{margin:0 0 4mm 0}
.cl-signature{margin-top:2mm;font-weight:600}
.cl-placeholder{color:#94a3b8;font-style:italic}
.cl-header-name{margin:0;font-size:30px;line-height:1.05;font-weight:700;letter-spacing:.01em}
.cl-header-title{margin:2mm 0 0;font-size:14px;color:#334155}
.cl-divider{height:1px;background:rgba(15,23,42,.16);margin:5mm 0 0}
@media print{html,body{background:#fff}.cl-page{margin:0;box-shadow:none;break-inside:avoid-page;page-break-inside:avoid}}
${css}
</style></head><body data-template-id="${esc(d.templateId)}"><main class="cl-page ${markerClass}">${body}</main></body></html>`;
}

function renderCommon(d, extras = '') {
  return `<div class="cl-content">
    <header class="cl-header">
      <h1 class="cl-header-name">${esc(d.senderName || 'Your Name')}</h1>
      <p class="cl-header-title">${esc(d.senderTitle || 'Professional Title')}</p>
      <p class="cl-meta">${metaLines(d) || '<span class="cl-placeholder">email · phone · location</span>'}</p>
    </header>
    ${extras}
    <p class="cl-date">${esc(d.date || 'Date')}</p>
    <section class="cl-recipient">${recipientBlock(d)}</section>
    ${d.subject ? `<p class="cl-subject"><strong>Re:</strong> ${esc(d.subject)}</p>` : ''}
    <p class="cl-greeting">${esc(d.greeting)}</p>
    ${bodyBlock(d)}
    <section class="cl-closing"><p>${esc(d.closing)}</p><p class="cl-signature">${esc(d.signatureName)}</p></section>
  </div>`;
}

export function renderProfessionalBlueLetterheadHtml(draft = {}) {
  const d = normalizeCoverLetterDraft({ ...draft, templateId: 'professional-blue-letterhead' });
  return doc(
    d,
    renderCommon(d, '<div class="cl-divider"></div>'),
    '.professionalBlueLetterhead{border-top:6mm solid #1d4ed8}.professionalBlueLetterhead .cl-header-title{color:#1e40af}',
    'professionalBlueLetterhead'
  );
}

export function renderCleanModernHeaderHtml(draft = {}) {
  const d = normalizeCoverLetterDraft({ ...draft, templateId: 'clean-modern-header' });
  return doc(
    d,
    renderCommon(d),
    '.cleanModernHeader .cl-header{display:grid;grid-template-columns:1fr auto;gap:8mm;align-items:end}.cleanModernHeader .cl-meta{text-align:right}',
    'cleanModernHeader'
  );
}

export function renderDarkHeaderCorporateHtml(draft = {}) {
  const d = normalizeCoverLetterDraft({ ...draft, templateId: 'dark-header-corporate' });
  return doc(
    d,
    `<div class="cl-corporate-header"><h1 class="cl-header-name">${esc(d.senderName || 'Your Name')}</h1><p class="cl-header-title">${esc(d.senderTitle || 'Professional Title')}</p><p class="cl-meta">${metaLines(d) || '<span class="cl-placeholder">email · phone · location</span>'}</p></div>${renderCommon({ ...d, senderName: '', senderTitle: '' })}`,
    '.darkHeaderCorporate{padding-top:0}.darkHeaderCorporate .cl-corporate-header{margin:0 -17mm 5mm;background:#0f172a;color:#e2e8f0;padding:11mm 17mm}.darkHeaderCorporate .cl-corporate-header .cl-header-title,.darkHeaderCorporate .cl-corporate-header .cl-meta{color:#cbd5e1}.darkHeaderCorporate .cl-header{display:none}',
    'darkHeaderCorporate'
  );
}

export function renderMinimalWideNameHeaderHtml(draft = {}) {
  const d = normalizeCoverLetterDraft({ ...draft, templateId: 'minimal-wide-name-header' });
  return doc(
    d,
    renderCommon(d),
    '.minimalWideNameHeader .cl-header-name{font-size:36px;letter-spacing:.06em;text-transform:uppercase;font-weight:500}',
    'minimalWideNameHeader'
  );
}

export function renderPlainReSubjectHtml(draft = {}) {
  const d = normalizeCoverLetterDraft({ ...draft, templateId: 'plain-re-subject' });
  return doc(
    d,
    renderCommon({ ...d, subject: d.subject || 'Application for the advertised role' }),
    '.plainReSubject .cl-page,.plainReSubject{font-family:Arial,Helvetica,sans-serif}.plainReSubject .cl-subject{font-weight:600;text-transform:none}',
    'plainReSubject'
  );
}

export function renderSimpleEverydayFormalHtml(draft = {}) {
  const d = normalizeCoverLetterDraft({ ...draft, templateId: 'simple-everyday-formal' });
  return doc(
    d,
    renderCommon(d),
    '.simpleEverydayFormal .cl-page,.simpleEverydayFormal{font-family:Calibri,"Segoe UI",Arial,sans-serif}.simpleEverydayFormal .cl-header-title{font-size:13px}',
    'simpleEverydayFormal'
  );
}

export function renderPremiumElegantBusinessHtml(draft = {}) {
  const d = normalizeCoverLetterDraft({ ...draft, templateId: 'premium-elegant-business' });
  return doc(
    d,
    renderCommon(d, '<div class="cl-elegant-rule"></div>'),
    '.premiumElegantBusiness .cl-page,.premiumElegantBusiness{font-family:Georgia,"Times New Roman",serif}.premiumElegantBusiness .cl-elegant-rule{height:2px;background:linear-gradient(90deg,#7c3aed,#c4b5fd);margin:4mm 0 0}.premiumElegantBusiness .cl-header-title{letter-spacing:.03em;text-transform:uppercase;font-size:12px}',
    'premiumElegantBusiness'
  );
}

export const templateMarkersById = {
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
