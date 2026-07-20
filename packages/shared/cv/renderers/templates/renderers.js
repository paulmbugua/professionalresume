import {
  buildCssVars,
  defaultSectionOrder,
  esc,
  normalizeCvDraft,
  paginationCss,
  renderRichText,
  safeKey,
  sectionVisible,
} from './helpers.js';
import { buildCvFontFaceCss, getTemplateFontDependencies, getTemplateFontStack } from './fonts.js';

const contactLine = (b) => esc([b.email, b.phone, b.location].filter(Boolean).join(' - '));

const PAGE_SHELL = `
.page{width:var(--page-width);min-height:var(--page-height);margin:16px auto;background:#fff;box-shadow:0 10px 28px rgba(15,23,42,.12)}
@media print{.page{margin:0 !important;box-shadow:none !important}}
`;
const TYPOGRAPHY_BASE = `
h1{margin:0;font-size:var(--resolvedNameSize);line-height:1.1}
h2{font-size:var(--resolvedSectionTitleSize);letter-spacing:.1em;text-transform:uppercase}
h3{margin:0;font-size:var(--resolvedH3Size)}
p,li{font-size:var(--resolvedBodySize);line-height:var(--lineHeight)}
.muted{font-size:var(--resolvedMetaSize);color:var(--mutedTextColor)}
section{margin-bottom:var(--resolvedSectionGap)}
.item{margin-bottom:var(--resolvedItemGap)}
`;

function renderSectionMap(d) {
  return {
    summary:
      d.summary?.trim() || d.richText?.summary?.trim()
        ? `<section><h2>Summary</h2><p>${renderRichText(d, 'summary', d.summary || '')}</p></section>`
        : '',
    skills: d.skills?.length
      ? `<section><h2>Skills</h2><p>${esc(d.skills.join(' - '))}</p></section>`
      : '',
    experience: d.experience?.length
      ? `<section><h2>Experience</h2>${d.experience
          .map(
            (e, idx) =>
              `<article class="item" data-k="${esc(`${safeKey(e.company)}|${idx}`)}"><h3>${esc(e.role || '')} ${e.company ? `- ${esc(e.company)}` : ''}</h3><p class="muted">${esc([e.start, e.end].filter(Boolean).join(' - '))}${e.location ? ` - ${esc(e.location)}` : ''}</p>${
                (e.bullets || []).length
                  ? `<ul>${e.bullets
                      .filter(Boolean)
                      .map((b) => `<li>${esc(b)}</li>`)
                      .join('')}</ul>`
                  : ''
              }</article>`
          )
          .join('')}</section>`
      : '',
    education: d.education?.length
      ? `<section><h2>Education</h2>${d.education.map((e, idx) => `<article class="item" data-k="${esc(`${safeKey(e.school)}|${idx}`)}"><h3>${esc(e.program || '')} ${e.school ? `- ${esc(e.school)}` : ''}</h3><p class="muted">${esc([e.start, e.end].filter(Boolean).join(' - '))}</p>${e.details ? `<p>${esc(e.details)}</p>` : ''}</article>`).join('')}</section>`
      : '',
    projects: d.projects?.length
      ? `<section><h2>Projects</h2>${d.projects
          .map(
            (p, idx) =>
              `<article class="item" data-k="${esc(`${safeKey(p.name)}|${idx}`)}"><h3>${esc(p.name || '')}</h3>${p.description ? `<p>${esc(p.description)}</p>` : ''}${
                (p.bullets || []).length
                  ? `<ul>${p.bullets
                      .filter(Boolean)
                      .map((b) => `<li>${esc(b)}</li>`)
                      .join('')}</ul>`
                  : ''
              }</article>`
          )
          .join('')}</section>`
      : '',
    certifications: d.certifications?.length
      ? `<section><h2>Certifications</h2>${d.certifications.map((c, idx) => `<p data-k="${esc(`${safeKey(c.name)}|${idx}`)}"><strong>${esc(c.name || '')}</strong>${c.issuer ? ` - ${esc(c.issuer)}` : ''}${c.year ? ` (${esc(c.year)})` : ''}</p>`).join('')}</section>`
      : '',
    extras:
      d.extras?.languages?.length || d.extras?.interests?.length
        ? `<section><h2>Extras</h2>${d.extras?.languages?.length ? `<p><strong>Languages:</strong> ${esc(d.extras.languages.join(', '))}</p>` : ''}${d.extras?.interests?.length ? `<p><strong>Interests:</strong> ${esc(d.extras.interests.join(', '))}</p>` : ''}</section>`
        : '',
  };
}

function joinSections(d, map) {
  return (d.sectionOrder || defaultSectionOrder)
    .map((k) => (sectionVisible(d, k) ? map[k] || '' : ''))
    .filter(Boolean)
    .join('');
}

function doc(d, body, css) {
  const templateId = String(d.templateId || '').trim();
  const fontFamily = getTemplateFontStack(templateId);
  const fontFaceCss = buildCvFontFaceCss({
    fontKeys: getTemplateFontDependencies(templateId),
  });
  const cssVars = `${buildCssVars(d)}:root{--fontFamily:${fontFamily};}`;

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style id="cv-font-faces">${fontFaceCss}</style><style>${cssVars}${paginationCss}${PAGE_SHELL}${css}</style></head><body data-template-id="${esc(templateId)}">${body}</body></html>`;
}

export function renderModernSidebarHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const sidebarKeys = ['summary', 'skills', 'certifications', 'extras'];
  const sidebar = sidebarKeys.map((k) => (sectionVisible(d, k) ? m[k] || '' : '')).join('');
  const main = (d.sectionOrder || defaultSectionOrder)
    .filter((k) => !sidebarKeys.includes(k))
    .map((k) => (sectionVisible(d, k) ? m[k] || '' : ''))
    .join('');
  return doc(
    d,
    `<main class="page modernSidebarLayout"><aside class="sidebar"><h1>${esc(d.basics.name || 'Your Name')}</h1><p class="headline">${esc(d.basics.headline || '')}</p><p class="contact">${contactLine(d.basics)}</p>${sidebar}</aside><section class="content">${main}</section></main>`,
    `${TYPOGRAPHY_BASE}body{background:#e2e8f0;font-family:var(--fontFamily);color:var(--textColor)}.page{display:grid;grid-template-columns:33% 1fr}.sidebar{background:var(--sidebarBg);color:var(--sidebarText);padding:14.5mm 9mm}.content{padding:14.5mm 11mm}.headline{margin:5px 0 0;color:#cbd5e1;font-size:var(--resolvedHeadlineSize)}.contact{margin:4px 0 0;color:#cbd5e1;font-size:var(--resolvedSidebarMetaSize)}.sidebar p,.sidebar li{font-size:var(--resolvedSidebarBodySize)}.sidebar .muted{font-size:var(--resolvedSidebarMetaSize);color:#cbd5e1}.sidebar h2{color:#e2e8f0}.content h2{color:var(--accent)}h2{margin:10px 0 6px;letter-spacing:.11em}ul{margin:5px 0 0;padding-left:16px}`
  );
}

export function renderBoldHeaderHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const sections = joinSections(d, renderSectionMap(d));
  return doc(
    d,
    `<main class="page boldHeaderLayout"><header class="heroHeader"><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(d.basics.headline || '')}</p><div>${contactLine(d.basics)}</div></header><section class="content">${sections}</section></main>`,
    `${TYPOGRAPHY_BASE}body{background:#e2e8f0;font-family:var(--fontFamily);color:var(--textColor)}.heroHeader{background:var(--headerBg);color:var(--headerText);padding:12mm}.heroHeader p{font-size:var(--resolvedHeadlineSize);margin:4px 0 0}.heroHeader div{font-size:var(--resolvedMetaSize);margin-top:4px}.content{padding:10.5mm 12mm}h2{margin:0 0 6px;letter-spacing:.12em;color:var(--accent)}`
  );
}

export function renderModernTealHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const left = ['summary', 'skills', 'education', 'extras'];
  const right = ['experience', 'projects', 'certifications'];
  return doc(
    d,
    `<main class="page modernTealLayout"><div class="inner"><h1 class="name">${esc(d.basics.name || 'Your Name')}</h1><p class="headline">${esc(d.basics.headline || '')}</p><div class="accent"></div><div class="grid"><aside>${left.map((k) => (sectionVisible(d, k) ? m[k] || '' : '')).join('')}</aside><section>${right.map((k) => (sectionVisible(d, k) ? m[k] || '' : '')).join('')}</section></div></div></main>`,
    `${TYPOGRAPHY_BASE}body{background:#f1f5f9;font-family:var(--fontFamily)}.inner{padding:11.5mm}.name{font-weight:800}.headline{margin:4px 0 0;color:var(--mutedTextColor);font-size:var(--resolvedHeadlineSize)}.accent{height:5px;background:var(--accent);margin:8px 0 0}.grid{display:grid;grid-template-columns:67mm 1fr;gap:9mm;margin-top:9mm}h2{letter-spacing:.12em;color:var(--primary);border-bottom:2px solid rgba(14,165,165,.35);padding-bottom:5px}`
  );
}

export function renderModernSidebarBlueHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const base = renderModernSidebarHtml({ ...d, templateId: 'modern-sidebar-blue' }).replace(
    'modernSidebarLayout',
    'modernSidebarBlueLayout'
  );
  const resolvedPhotoUrl = (d.basics?.photoUrl || '').trim() || '/assets/profile_photo.png';
  const avatar = `<img class="avatar-img" src="${esc(resolvedPhotoUrl)}" alt="Profile photo" width="86" height="108" />`;
  const withAvatar = base.replace(
    '<aside class="sidebar"><h1>',
    `<aside class="sidebar"><div class="avatar">${avatar}</div><h1>`
  );
  return withAvatar.replace(
    '</style>',
    '.modernSidebarBlueLayout .sidebar{display:flex;flex-direction:column;align-items:flex-start}.modernSidebarBlueLayout .avatar{position:relative;flex:0 0 auto;align-self:flex-start;width:22.754mm;height:28.575mm;border-radius:2.646mm;overflow:hidden;background:rgba(255,255,255,.2);margin:0 0 3.704mm;border:0.529mm solid rgba(255,255,255,.55);box-shadow:0 1.058mm 4.233mm rgba(15,23,42,.15)}.modernSidebarBlueLayout .avatar-img{display:block;width:100%;height:100%;min-width:100%;min-height:100%;object-fit:cover;object-position:center}@media print{.modernSidebarBlueLayout .avatar{break-inside:avoid;page-break-inside:avoid}}</style>'
  );
}

export function renderAtsMinimalHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const sections = joinSections(d, renderSectionMap(d));
  return doc(
    d,
    `<main class="page atsMinimalLayout"><div class="inner"><header><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(d.basics.headline || '')}</p><p class="muted">${contactLine(d.basics)}</p></header>${sections}</div></main>`,
    `${TYPOGRAPHY_BASE}body{background:#fff;font-family:Arial,sans-serif;color:#111}.inner{padding:11.5mm 12mm}header{border-bottom:1.5px solid #111;padding-bottom:7px;margin-bottom:9px}header p{margin:4px 0 0;font-size:var(--resolvedHeadlineSize)}h2{letter-spacing:.08em;border-top:1px solid #222;padding-top:5px;margin-top:9px}`
  );
}

export function renderAtsCompactHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const sections = joinSections(d, renderSectionMap(d));
  return doc(
    d,
    `<main class="page atsCompactLayout"><div class="inner"><header><h1>${esc(d.basics.name || 'Your Name')}</h1><div>${contactLine(d.basics)}</div></header>${sections}</div></main>`,
    `${TYPOGRAPHY_BASE}body{font-family:var(--fontFamily);background:#fff}.inner{padding:10.5mm 12mm}header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #ddd;padding-bottom:6px}header div{font-size:var(--resolvedMetaSize)}h2{letter-spacing:.09em;margin:8px 0 5px;color:#111}`
  );
}

export function renderElegantSerifHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const sections = joinSections(d, renderSectionMap(d));
  return doc(
    d,
    `<main class="page elegantSerifLayout"><div class="inner"><header><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(d.basics.headline || '')}</p></header>${sections}</div></main>`,
    `${TYPOGRAPHY_BASE}body{background:#f8fafc;font-family:Georgia,'Times New Roman',serif;color:#1f2937}.inner{padding:12.5mm}header{text-align:center;border-bottom:1px solid #d1d5db;padding-bottom:8px;margin-bottom:9px}header p{margin:4px 0 0;font-size:var(--resolvedHeadlineSize)}h2{letter-spacing:.11em;color:#374151}`
  );
}

export function renderCreativeTimelineHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  return doc(
    d,
    `<main class="page creativeTimelineLayout"><div class="inner"><header><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(d.basics.headline || '')}</p></header>${sectionVisible(d, 'experience') ? m.experience : ''}${(
      d.sectionOrder || defaultSectionOrder
    )
      .filter((k) => k !== 'experience')
      .map((k) => (sectionVisible(d, k) ? m[k] || '' : ''))
      .join('')}</div></main>`,
    `${TYPOGRAPHY_BASE}body{background:#eef2ff;font-family:var(--fontFamily)}.inner{padding:12.5mm}header p{margin:4px 0 0;font-size:var(--resolvedHeadlineSize)}h2{letter-spacing:.13em;color:#4338ca}.item{position:relative;padding-left:14px}.item:before{content:'';position:absolute;left:0;top:5px;width:8px;height:8px;border-radius:999px;background:#6366f1}`
  );
}

export function renderCompactOnePagerHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const sections = joinSections(d, renderSectionMap(d));
  return doc(
    d,
    `<main class="page compactOnePagerLayout"><div class="inner"><header><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(d.basics.headline || '')}</p><p class="muted">${contactLine(d.basics)}</p></header>${sections}</div></main>`,
    `${TYPOGRAPHY_BASE}body{background:#f8fafc;font-family:var(--fontFamily)}.inner{padding:10mm 11mm}header{margin-bottom:7px}header p{margin:4px 0 0;font-size:var(--resolvedHeadlineSize)}h2{margin:7px 0 4px;letter-spacing:.1em;color:#0f172a}.muted{color:#64748b}`
  );
}

export function renderExecutiveBandHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const mainKeys = ['experience', 'projects'];
  const sideKeys = ['skills', 'education', 'certifications', 'extras'];
  const main = mainKeys.map((k) => (sectionVisible(d, k) ? m[k] || '' : '')).join('');
  const side = sideKeys.map((k) => (sectionVisible(d, k) ? m[k] || '' : '')).join('');
  return doc(
    d,
    `<main class="page executiveBandLayout"><div class="topline"></div><header><div><h1>${esc(d.basics.name || 'Your Name')}</h1><p class="headline">${esc(d.basics.headline || '')}</p></div><p class="contact">${contactLine(d.basics)}</p></header>${sectionVisible(d, 'summary') ? `<section class="summaryBand">${m.summary || ''}</section>` : ''}<div class="grid"><section class="maincol">${main}</section><aside class="sidecol">${side}</aside></div></main>`,
    `${TYPOGRAPHY_BASE}body{background:#eef2f7;font-family:var(--fontFamily);color:var(--textColor)}.executiveBandLayout{padding:0}.topline{height:6mm;background:linear-gradient(90deg,var(--primary),var(--accent))}header{padding:11mm 13mm 7mm;display:grid;grid-template-columns:1fr 62mm;gap:10mm;border-bottom:1px solid #dbe3ee}header h1{font-size:var(--resolvedNameSize)}.headline{margin:4px 0 0;color:var(--mutedTextColor);font-size:var(--resolvedHeadlineSize)}.contact{text-align:right;margin:0;color:var(--mutedTextColor);font-size:var(--resolvedMetaSize)}.summaryBand{padding:7mm 13mm;background:#f8fafc;border-bottom:1px solid #e2e8f0}.summaryBand section{margin:0}.grid{display:grid;grid-template-columns:1fr 62mm;gap:10mm;padding:8mm 13mm 12mm}.maincol h2{color:var(--primary)}.sidecol{border-left:1px solid #dbe3ee;padding-left:8mm}.sidecol h2{color:var(--accent)}h2{margin:0 0 5px;letter-spacing:.13em}ul{margin:4px 0 0;padding-left:17px}.item{break-inside:auto;page-break-inside:auto}`
  );
}

export function renderSkillMatrixHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const sections = ['summary', 'experience', 'projects', 'education', 'certifications', 'extras']
    .map((k) => (sectionVisible(d, k) ? m[k] || '' : ''))
    .join('');
  const skills = d.skills?.length
    ? `<section class="matrixSkills"><h2>Core Skills</h2><div>${d.skills.map((skill) => `<span>${esc(skill)}</span>`).join('')}</div></section>`
    : '';
  return doc(
    d,
    `<main class="page skillMatrixLayout"><header><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(d.basics.headline || '')}</p><p class="muted">${contactLine(d.basics)}</p></header>${skills}<div class="content">${sections}</div></main>`,
    `${TYPOGRAPHY_BASE}body{background:#f3f4f6;font-family:var(--fontFamily);color:var(--textColor)}.skillMatrixLayout{padding:11mm 12mm}.skillMatrixLayout header{display:grid;grid-template-columns:1fr;gap:2px;border-bottom:2px solid var(--primary);padding-bottom:6mm}.skillMatrixLayout header p{margin:2px 0 0;font-size:var(--resolvedHeadlineSize)}.matrixSkills{margin:7mm 0;padding:6mm;background:#f8fafc;border:1px solid #dbe3ee}.matrixSkills h2{margin:0 0 5px;color:var(--primary)}.matrixSkills div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px 6px}.matrixSkills span{font-size:var(--resolvedBodySize);line-height:1.35;border-bottom:1px solid #e2e8f0;padding-bottom:2px}.content h2{color:var(--accent);border-bottom:1px solid #dbe3ee;padding-bottom:4px;margin:0 0 5px}ul{margin:4px 0 0;padding-left:17px}.item{break-inside:auto;page-break-inside:auto}`
  );
}

export function renderAcademicCompactHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const order = [
    'summary',
    'education',
    'certifications',
    'projects',
    'experience',
    'skills',
    'extras',
  ];
  const sections = order.map((k) => (sectionVisible(d, k) ? m[k] || '' : '')).join('');
  return doc(
    d,
    `<main class="page academicCompactLayout"><header><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(d.basics.headline || '')}</p><p class="muted">${contactLine(d.basics)}</p></header>${sections}</main>`,
    `${TYPOGRAPHY_BASE}body{background:#f8fafc;font-family:var(--fontFamily);color:#111827}.academicCompactLayout{padding:12mm 14mm}.academicCompactLayout header{text-align:left;border-bottom:1.5px solid #111827;padding-bottom:7px;margin-bottom:8mm}.academicCompactLayout header p{margin:3px 0 0;font-size:var(--resolvedHeadlineSize)}h2{margin:0 0 5px;border-bottom:1px solid #cbd5e1;padding-bottom:4px;letter-spacing:.14em;color:#374151}.item{margin-bottom:6px}ul{margin:3px 0 0;padding-left:16px}.muted{color:#4b5563}`
  );
}

export function renderProjectForwardHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const order = [
    'summary',
    'projects',
    'skills',
    'experience',
    'education',
    'certifications',
    'extras',
  ];
  const sections = order.map((k) => (sectionVisible(d, k) ? m[k] || '' : '')).join('');
  return doc(
    d,
    `<main class="page projectForwardLayout"><header><div><p class="label">Project-forward resume</p><h1>${esc(d.basics.name || 'Your Name')}</h1><p class="headline">${esc(d.basics.headline || '')}</p></div><p class="contact">${contactLine(d.basics)}</p></header><section class="content">${sections}</section></main>`,
    `${TYPOGRAPHY_BASE}body{background:#eef2ff;font-family:var(--fontFamily);color:var(--textColor)}.projectForwardLayout{padding:0}.projectForwardLayout header{display:grid;grid-template-columns:1fr 70mm;gap:8mm;padding:11mm 12mm;background:#f8fafc;border-bottom:4px solid var(--accent)}.label{margin:0 0 3px;color:var(--accent);font-size:var(--resolvedMetaSize);font-weight:700;text-transform:uppercase;letter-spacing:.16em}.headline{margin:3px 0 0;color:var(--mutedTextColor);font-size:var(--resolvedHeadlineSize)}.contact{text-align:right;color:var(--mutedTextColor);font-size:var(--resolvedMetaSize);margin:0}.content{padding:9mm 12mm 12mm}.content h2{color:var(--primary);border-left:4px solid var(--accent);padding-left:6px;margin:0 0 5px;letter-spacing:.12em}.content section:nth-of-type(2){background:#f8fafc;border:1px solid #dbe3ee;padding:5mm;margin-bottom:6mm}ul{margin:4px 0 0;padding-left:17px}.item{break-inside:auto;page-break-inside:auto}`
  );
}

export function renderOperationsLedgerHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const sections = joinSections(d, m);
  return doc(
    d,
    `<main class="page operationsLedgerLayout"><header><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(d.basics.headline || '')}</p><p class="muted">${contactLine(d.basics)}</p></header><div class="ledger">${sections}</div></main>`,
    `${TYPOGRAPHY_BASE}body{background:#f4f7f6;font-family:var(--fontFamily);color:#10201c}.operationsLedgerLayout{padding:11mm 12mm}.operationsLedgerLayout header{border:1px solid #b8c7c1;padding:7mm;background:#fbfdfc}.operationsLedgerLayout header p{margin:3px 0 0;font-size:var(--resolvedHeadlineSize)}.ledger{margin-top:7mm}.ledger section{display:grid;grid-template-columns:35mm 1fr;gap:7mm;border-top:1px solid #cbd8d3;padding-top:5mm;margin-bottom:5mm}.ledger h2{margin:0;color:#315f52;letter-spacing:.14em}.ledger section>*:not(h2){grid-column:2}.ledger section>h2+article,.ledger section>h2+p,.ledger section>h2+ul{margin-top:0}.item{break-inside:auto;page-break-inside:auto}ul{margin:4px 0 0;padding-left:17px}.muted{color:#526b63}`
  );
}
export const templateMarkersById = {
  'modern-sidebar': ['data-template-id="modern-sidebar"', 'modernSidebarLayout', '--sidebarBg:'],
  'modern-sidebar-blue': [
    'data-template-id="modern-sidebar-blue"',
    'modernSidebarBlueLayout',
    '--sidebarBg:',
  ],
  'bold-header': ['data-template-id="bold-header"', 'heroHeader', '--headerBg:'],
  'modern-teal': ['data-template-id="modern-teal"', 'modernTealLayout', '--accent:'],
  'ats-minimal': ['data-template-id="ats-minimal"', 'atsMinimalLayout'],
  'ats-compact': ['data-template-id="ats-compact"', 'atsCompactLayout'],
  'elegant-serif': ['data-template-id="elegant-serif"', 'elegantSerifLayout'],
  'creative-timeline': ['data-template-id="creative-timeline"', 'creativeTimelineLayout'],
  'compact-one-pager': ['data-template-id="compact-one-pager"', 'compactOnePagerLayout'],
  'executive-band': ['data-template-id="executive-band"', 'executiveBandLayout'],
  'skill-matrix': ['data-template-id="skill-matrix"', 'skillMatrixLayout'],
  'academic-compact': ['data-template-id="academic-compact"', 'academicCompactLayout'],
  'project-forward': ['data-template-id="project-forward"', 'projectForwardLayout'],
  'operations-ledger': ['data-template-id="operations-ledger"', 'operationsLedgerLayout'],
};
