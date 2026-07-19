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

const contactLine = (b) => esc([b.email, b.phone, b.location].filter(Boolean).join(' | '));

const PAGE_SHELL = `
.page{width:var(--page-width);min-height:var(--page-height);margin:16px auto;background:#fff;box-shadow:0 10px 28px rgba(15,23,42,.12)}
@media print{.page{margin:0 !important;box-shadow:none !important}}
`;

const TYPOGRAPHY_BASE = `
h1{margin:0;font-size:var(--resolvedNameSize);line-height:1.08}
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
      ? `<section><h2>Skills</h2><p>${esc(d.skills.join(' | '))}</p></section>`
      : '',
    experience: d.experience?.length
      ? `<section><h2>Experience</h2>${d.experience
          .map(
            (e, idx) =>
              `<article class="item" data-k="${esc(`${safeKey(e.company)}|${idx}`)}"><h3>${esc(e.role || '')}${
                e.company ? ` - ${esc(e.company)}` : ''
              }</h3><p class="muted">${esc([e.start, e.end].filter(Boolean).join(' - '))}${
                e.location ? ` | ${esc(e.location)}` : ''
              }</p>${
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
      ? `<section><h2>Education</h2>${d.education
          .map(
            (e, idx) =>
              `<article class="item" data-k="${esc(`${safeKey(e.school)}|${idx}`)}"><h3>${esc(e.program || '')}${
                e.school ? ` - ${esc(e.school)}` : ''
              }</h3><p class="muted">${esc([e.start, e.end].filter(Boolean).join(' - '))}</p>${
                e.details ? `<p>${esc(e.details)}</p>` : ''
              }</article>`
          )
          .join('')}</section>`
      : '',
    projects: d.projects?.length
      ? `<section><h2>Projects</h2>${d.projects
          .map(
            (p, idx) =>
              `<article class="item" data-k="${esc(`${safeKey(p.name)}|${idx}`)}"><h3>${esc(p.name || '')}</h3>${
                p.description ? `<p>${esc(p.description)}</p>` : ''
              }${
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
      ? `<section><h2>Certifications</h2>${d.certifications
          .map(
            (c, idx) =>
              `<p data-k="${esc(`${safeKey(c.name)}|${idx}`)}"><strong>${esc(c.name || '')}</strong>${
                c.issuer ? ` | ${esc(c.issuer)}` : ''
              }${c.year ? ` (${esc(c.year)})` : ''}</p>`
          )
          .join('')}</section>`
      : '',
    extras:
      d.extras?.languages?.length || d.extras?.interests?.length
        ? `<section><h2>Extras</h2>${
            d.extras?.languages?.length
              ? `<p><strong>Languages:</strong> ${esc(d.extras.languages.join(', '))}</p>`
              : ''
          }${
            d.extras?.interests?.length
              ? `<p><strong>Interests:</strong> ${esc(d.extras.interests.join(', '))}</p>`
              : ''
          }</section>`
        : '',
  };
}

function joinSections(d, map, order = d.sectionOrder || defaultSectionOrder) {
  return order
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

export function renderNairobiGridHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const top = ['summary', 'skills'];
  const rest = ['experience', 'projects', 'education', 'certifications', 'extras'];
  return doc(
    d,
    `<main class="page nairobiGridLayout"><header><div><p class="kicker">Nairobi professional profile</p><h1>${esc(
      d.basics.name || 'Your Name'
    )}</h1><p>${esc(d.basics.headline || '')}</p></div><div class="contact">${contactLine(
      d.basics
    )}</div></header><div class="intro">${top
      .map((k) => (sectionVisible(d, k) ? m[k] || '' : ''))
      .join('')}</div><div class="body">${rest
      .map((k) => (sectionVisible(d, k) ? m[k] || '' : ''))
      .join('')}</div></main>`,
    `${TYPOGRAPHY_BASE}body{background:#eef6ff;font-family:var(--fontFamily);color:#0f172a}.nairobiGridLayout{padding:12mm}.nairobiGridLayout header{display:grid;grid-template-columns:1fr 60mm;gap:8mm;padding-bottom:7mm;border-bottom:3px solid #0ea5e9}.kicker{margin:0 0 3px;color:#0369a1;font-size:var(--resolvedMetaSize);font-weight:800;text-transform:uppercase;letter-spacing:.16em}header p{margin:4px 0 0}.contact{align-self:end;text-align:right;color:#334155;font-size:var(--resolvedMetaSize);line-height:1.45}.intro{display:grid;grid-template-columns:1.15fr .85fr;gap:7mm;margin-top:7mm}.intro section{background:#f8fafc;border:1px solid #dbeafe;padding:5mm}.body{margin-top:7mm;columns:2 72mm;column-gap:10mm}.body section{break-inside:avoid;display:block}h2{margin:0 0 5px;color:#0369a1;border-bottom:1px solid #bfdbfe;padding-bottom:4px}ul{margin:4px 0 0;padding-left:17px}`
  );
}

export function renderDiplomaticClassicHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const sections = joinSections(d, renderSectionMap(d));
  return doc(
    d,
    `<main class="page diplomaticClassicLayout"><div class="rule"></div><header><h1>${esc(
      d.basics.name || 'Your Name'
    )}</h1><p>${esc(d.basics.headline || '')}</p><p class="muted">${contactLine(
      d.basics
    )}</p></header>${sections}</main>`,
    `${TYPOGRAPHY_BASE}body{background:#f7f3ea;font-family:var(--fontFamily);color:#1f2937}.diplomaticClassicLayout{padding:12mm 15mm;border-top:0}.rule{height:4mm;background:#8b5e34;margin:-12mm -15mm 9mm}header{text-align:center;border-bottom:1px solid #bfa98a;padding-bottom:7mm;margin-bottom:8mm}header h1{font-family:Georgia,'Times New Roman',serif;letter-spacing:.03em}header p{margin:4px 0 0}h2{margin:0 0 5px;color:#7c4a21;letter-spacing:.16em;border-bottom:1px solid #d6c6ad;padding-bottom:4px}.item{break-inside:avoid}ul{margin:4px 0 0;padding-left:18px}`
  );
}

export function renderImpactSidebarHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const side = ['summary', 'skills', 'certifications', 'extras'];
  const main = ['experience', 'projects', 'education'];
  return doc(
    d,
    `<main class="page impactSidebarLayout"><aside><div class="badge">Impact</div><h1>${esc(
      d.basics.name || 'Your Name'
    )}</h1><p class="headline">${esc(d.basics.headline || '')}</p><p class="contact">${contactLine(
      d.basics
    )}</p>${side.map((k) => (sectionVisible(d, k) ? m[k] || '' : '')).join('')}</aside><section class="main">${main
      .map((k) => (sectionVisible(d, k) ? m[k] || '' : ''))
      .join('')}</section></main>`,
    `${TYPOGRAPHY_BASE}body{background:#f1f5f9;font-family:var(--fontFamily);color:#172033}.impactSidebarLayout{display:grid;grid-template-columns:70mm 1fr}.impactSidebarLayout aside{background:#111827;color:#f8fafc;padding:12mm 9mm}.impactSidebarLayout .main{padding:12mm 12mm}.badge{display:inline-block;background:#f97316;color:#fff;font-size:var(--resolvedMetaSize);font-weight:900;text-transform:uppercase;letter-spacing:.14em;padding:4px 8px;margin-bottom:8mm}.headline,.contact{color:#cbd5e1}.contact{font-size:var(--resolvedSidebarMetaSize)}aside h2{color:#fed7aa}aside p,aside li{font-size:var(--resolvedSidebarBodySize)}aside .muted{color:#cbd5e1}.main h2{color:#f97316;border-left:5px solid #f97316;padding-left:7px}ul{margin:4px 0 0;padding-left:17px}.item{break-inside:avoid}`
  );
}

export function renderAnalystDashboardHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const sections = joinSections(d, m, [
    'experience',
    'projects',
    'education',
    'certifications',
    'extras',
  ]);
  const skills = d.skills?.length
    ? `<div class="skillGrid">${d.skills.map((skill) => `<span>${esc(skill)}</span>`).join('')}</div>`
    : '';
  return doc(
    d,
    `<main class="page analystDashboardLayout"><header><div><p class="kicker">Data-ready resume</p><h1>${esc(
      d.basics.name || 'Your Name'
    )}</h1><p>${esc(d.basics.headline || '')}</p></div><p>${contactLine(d.basics)}</p></header><section class="summary">${
      m.summary || ''
    }</section><section class="skills"><h2>Capability Dashboard</h2>${skills}</section><div class="content">${sections}</div></main>`,
    `${TYPOGRAPHY_BASE}body{background:#e8eef5;font-family:var(--fontFamily);color:#111827}.analystDashboardLayout{padding:11mm 12mm}.analystDashboardLayout header{background:#0f172a;color:#fff;padding:7mm;display:grid;grid-template-columns:1fr 62mm;gap:8mm}.kicker{margin:0 0 3px;color:#93c5fd;font-size:var(--resolvedMetaSize);font-weight:800;text-transform:uppercase;letter-spacing:.16em}header p{margin:3px 0 0;color:#cbd5e1}.summary{margin:7mm 0 0}.summary section{margin:0;background:#f8fafc;border:1px solid #dbe3ee;padding:5mm}.skills{margin-top:6mm}.skillGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.skillGrid span{background:#dbeafe;border-left:4px solid #2563eb;padding:5px;font-size:var(--resolvedMetaSize);font-weight:700}.content{margin-top:7mm}.content h2{color:#2563eb;border-bottom:1px solid #bfdbfe;padding-bottom:4px}ul{margin:4px 0 0;padding-left:17px}.item{break-inside:avoid}`
  );
}

export function renderServiceProHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const sections = joinSections(d, m, [
    'experience',
    'skills',
    'education',
    'certifications',
    'projects',
    'extras',
  ]);
  return doc(
    d,
    `<main class="page serviceProLayout"><header><div class="monogram">${esc(
      (d.basics.name || 'Y').slice(0, 1).toUpperCase()
    )}</div><div><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(
      d.basics.headline || ''
    )}</p><p class="muted">${contactLine(d.basics)}</p></div></header>${m.summary || ''}<div class="content">${sections}</div></main>`,
    `${TYPOGRAPHY_BASE}body{background:#fff7ed;font-family:var(--fontFamily);color:#2f2419}.serviceProLayout{padding:12mm}.serviceProLayout header{display:flex;gap:7mm;align-items:center;background:#fff3e5;border:1px solid #fed7aa;padding:7mm;margin-bottom:7mm}.monogram{width:20mm;height:20mm;border-radius:999px;background:#ea580c;color:#fff;display:grid;place-items:center;font-size:28px;font-weight:900}header p{margin:3px 0 0}.content section,.serviceProLayout>section{border-top:1px solid #fed7aa;padding-top:5mm}.content h2,.serviceProLayout>section h2{color:#c2410c;letter-spacing:.13em}h3{color:#431407}ul{margin:4px 0 0;padding-left:17px}.item{break-inside:avoid}`
  );
}

export function renderLegalFormalHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const sections = joinSections(d, m, [
    'summary',
    'experience',
    'education',
    'certifications',
    'skills',
    'projects',
    'extras',
  ]);
  return doc(
    d,
    `<main class="page legalFormalLayout"><header><p class="contact">${contactLine(d.basics)}</p><h1>${esc(
      d.basics.name || 'Your Name'
    )}</h1><p>${esc(d.basics.headline || '')}</p></header>${sections}</main>`,
    `${TYPOGRAPHY_BASE}body{background:#eef0f3;font-family:Georgia,'Times New Roman',serif;color:#111827}.legalFormalLayout{padding:14mm 15mm}.legalFormalLayout header{border-top:3px double #111827;border-bottom:1px solid #111827;text-align:center;padding:7mm 0;margin-bottom:8mm}.contact{margin:0 0 5px;color:#4b5563;font-size:var(--resolvedMetaSize)}header p{margin:4px 0 0}h2{font-family:Arial,sans-serif;color:#111827;border-bottom:1px solid #9ca3af;padding-bottom:4px;letter-spacing:.18em}h3{font-weight:800}.muted{color:#4b5563}.item{break-inside:avoid}ul{margin:4px 0 0;padding-left:18px}`
  );
}

export function renderClinicalCleanHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const left = ['summary', 'certifications', 'skills'];
  const right = ['experience', 'education', 'projects', 'extras'];
  return doc(
    d,
    `<main class="page clinicalCleanLayout"><header><div><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(
      d.basics.headline || ''
    )}</p></div><p>${contactLine(d.basics)}</p></header><div class="grid"><aside>${left
      .map((k) => (sectionVisible(d, k) ? m[k] || '' : ''))
      .join(
        ''
      )}</aside><section>${right.map((k) => (sectionVisible(d, k) ? m[k] || '' : '')).join('')}</section></div></main>`,
    `${TYPOGRAPHY_BASE}body{background:#ecfeff;font-family:var(--fontFamily);color:#12333a}.clinicalCleanLayout{padding:11mm 12mm}.clinicalCleanLayout header{display:grid;grid-template-columns:1fr 62mm;gap:8mm;border-bottom:5px solid #06b6d4;padding-bottom:6mm}header p{margin:3px 0 0;color:#42626a}.grid{display:grid;grid-template-columns:63mm 1fr;gap:9mm;margin-top:8mm}aside{background:#f0fdfa;border:1px solid #99f6e4;padding:6mm}h2{color:#0e7490;border-bottom:1px solid #a5f3fc;padding-bottom:4px}.item{break-inside:avoid}ul{margin:4px 0 0;padding-left:17px}`
  );
}

export function renderPortfolioCanvasHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const m = renderSectionMap(d);
  const sections = joinSections(d, m, [
    'projects',
    'summary',
    'experience',
    'skills',
    'education',
    'certifications',
    'extras',
  ]);
  return doc(
    d,
    `<main class="page portfolioCanvasLayout"><div class="stripe"></div><header><p>Portfolio resume</p><h1>${esc(
      d.basics.name || 'Your Name'
    )}</h1><h3>${esc(d.basics.headline || '')}</h3><div>${contactLine(d.basics)}</div></header><section class="canvas">${sections}</section></main>`,
    `${TYPOGRAPHY_BASE}body{background:#f5f3ff;font-family:var(--fontFamily);color:#1e1b4b}.portfolioCanvasLayout{position:relative;padding:0}.stripe{height:8mm;background:linear-gradient(90deg,#7c3aed,#06b6d4,#10b981)}header{padding:10mm 13mm 7mm;background:#fff}header p{margin:0 0 3px;text-transform:uppercase;letter-spacing:.18em;color:#7c3aed;font-size:var(--resolvedMetaSize);font-weight:900}header h3{margin:3px 0 0;color:#4c1d95}header div{margin-top:4px;color:#475569;font-size:var(--resolvedMetaSize)}.canvas{padding:8mm 13mm 12mm}.canvas section:first-child{background:#f8fafc;border:1px solid #ddd6fe;padding:6mm}.canvas h2{color:#7c3aed}.canvas h2:after{content:'';display:block;width:18mm;height:2px;background:#06b6d4;margin-top:4px}.item{break-inside:avoid}ul{margin:4px 0 0;padding-left:17px}`
  );
}

export const newTemplateMarkersById = {
  'nairobi-grid': ['data-template-id="nairobi-grid"', 'nairobiGridLayout'],
  'diplomatic-classic': ['data-template-id="diplomatic-classic"', 'diplomaticClassicLayout'],
  'impact-sidebar': ['data-template-id="impact-sidebar"', 'impactSidebarLayout'],
  'analyst-dashboard': ['data-template-id="analyst-dashboard"', 'analystDashboardLayout'],
  'service-pro': ['data-template-id="service-pro"', 'serviceProLayout'],
  'legal-formal': ['data-template-id="legal-formal"', 'legalFormalLayout'],
  'clinical-clean': ['data-template-id="clinical-clean"', 'clinicalCleanLayout'],
  'portfolio-canvas': ['data-template-id="portfolio-canvas"', 'portfolioCanvasLayout'],
};
