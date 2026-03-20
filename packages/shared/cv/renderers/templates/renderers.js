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

const contactLine = (b) => esc([b.email, b.phone, b.location].filter(Boolean).join(' • '));

const PAGE_SHELL = `
.page{width:var(--page-width);min-height:var(--page-height);margin:16px auto;background:#fff;box-shadow:0 10px 28px rgba(15,23,42,.12)}
@media print{.page{margin:0 !important;box-shadow:none !important}}
`;

function renderSectionMap(d) {
  return {
    summary:
      d.summary?.trim() || d.richText?.summary?.trim()
        ? `<section><h2>Summary</h2><p>${renderRichText(d, 'summary', d.summary || '')}</p></section>`
        : '',
    skills: d.skills?.length
      ? `<section><h2>Skills</h2><p>${esc(d.skills.join(' • '))}</p></section>`
      : '',
    experience: d.experience?.length
      ? `<section><h2>Experience</h2>${d.experience
          .map(
            (e, idx) =>
              `<article class="item" data-k="${esc(`${safeKey(e.company)}|${idx}`)}"><h3>${esc(e.role || '')} ${e.company ? `· ${esc(e.company)}` : ''}</h3><p class="muted">${esc([e.start, e.end].filter(Boolean).join(' - '))}${e.location ? ` • ${esc(e.location)}` : ''}</p>${
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
      ? `<section><h2>Education</h2>${d.education.map((e, idx) => `<article class="item" data-k="${esc(`${safeKey(e.school)}|${idx}`)}"><h3>${esc(e.program || '')} ${e.school ? `· ${esc(e.school)}` : ''}</h3><p class="muted">${esc([e.start, e.end].filter(Boolean).join(' - '))}</p>${e.details ? `<p>${esc(e.details)}</p>` : ''}</article>`).join('')}</section>`
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
      ? `<section><h2>Certifications</h2>${d.certifications.map((c, idx) => `<p data-k="${esc(`${safeKey(c.name)}|${idx}`)}"><strong>${esc(c.name || '')}</strong>${c.issuer ? ` • ${esc(c.issuer)}` : ''}${c.year ? ` (${esc(c.year)})` : ''}</p>`).join('')}</section>`
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
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${buildCssVars(d)}${paginationCss}${PAGE_SHELL}${css}</style></head><body data-template-id="${esc(d.templateId || '')}">${body}</body></html>`;
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
    `body{background:#e2e8f0;font-family:var(--fontFamily);font-size:11.3px;color:var(--textColor)}.page{display:grid;grid-template-columns:33% 1fr}.sidebar{background:var(--sidebarBg);color:var(--sidebarText);padding:14.5mm 9mm}.content{padding:14.5mm 11mm}.headline,.contact{color:#cbd5e1}.sidebar h2{color:#e2e8f0}.content h2{color:var(--accent)}h1{margin:0;font-size:calc(var(--h1Size) + 2px)}h2{margin:10px 0 6px;font-size:calc(var(--h3Size) + .2px);text-transform:uppercase;letter-spacing:.11em}h3{margin:0;font-size:12.4px}.muted{font-size:10.8px;color:#64748b}p{margin:3px 0;line-height:1.45}ul{margin:5px 0 0;padding-left:16px}`
  );
}

export function renderBoldHeaderHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const sections = joinSections(d, renderSectionMap(d));
  return doc(
    d,
    `<main class="page boldHeaderLayout"><header class="heroHeader"><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(d.basics.headline || '')}</p><div>${contactLine(d.basics)}</div></header><section class="content">${sections}</section></main>`,
    `body{background:#e2e8f0;font-family:var(--fontFamily);color:var(--textColor)}.heroHeader{background:var(--headerBg);color:var(--headerText);padding:12mm}.content{padding:10.5mm 12mm}h1{margin:0;font-size:calc(var(--h1Size) + 3px)}h2{margin:0 0 6px;font-size:calc(var(--h3Size) + .3px);text-transform:uppercase;letter-spacing:.12em;color:var(--accent)}section{margin-bottom:10px}h3{margin:0;font-size:12.2px}.muted{color:var(--mutedTextColor);font-size:10.8px}`
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
    `body{background:#f1f5f9;font-family:var(--fontFamily)}.inner{padding:11.5mm}.name{margin:0;font-size:calc(var(--h1Size) + 3px);font-weight:800;line-height:1.1}.headline{margin:4px 0 0;color:var(--mutedTextColor);font-size:13px}.accent{height:5px;background:var(--accent);margin:8px 0 0}.grid{display:grid;grid-template-columns:67mm 1fr;gap:9mm;margin-top:9mm}h2{font-size:calc(var(--h3Size) + .2px);letter-spacing:.12em;text-transform:uppercase;color:var(--primary);border-bottom:2px solid rgba(14,165,165,.35);padding-bottom:5px}.item{margin-bottom:6px}.muted{font-size:10.8px;color:var(--mutedTextColor)}p,li{font-size:11.3px;line-height:1.44}`
  );
}

export function renderModernSidebarBlueHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const base = renderModernSidebarHtml({ ...d, templateId: 'modern-sidebar-blue' }).replace(
    'modernSidebarLayout',
    'modernSidebarBlueLayout'
  );
  const initials = (
    (d.basics?.name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0] || '')
      .slice(0, 2)
      .join('') || 'YN'
  ).toUpperCase();
  const avatar = d.basics?.photoUrl
    ? `<img class="avatar-img" src="${esc(d.basics.photoUrl)}" alt="Profile photo" />`
    : esc(initials);
  const withAvatar = base.replace(
    '<aside class="sidebar"><h1>',
    `<aside class="sidebar"><div class="avatar">${avatar}</div><h1>`
  );
  return withAvatar.replace(
    '</style>',
    '.avatar{width:74px;height:74px;border-radius:999px;overflow:hidden;display:grid;place-items:center;background:rgba(255,255,255,.18);color:#fff;font-weight:700;font-size:24px;margin-bottom:12px}.avatar-img{width:100%;height:100%;object-fit:cover;display:block}</style>'
  );
}

export function renderAtsMinimalHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const sections = joinSections(d, renderSectionMap(d));
  return doc(
    d,
    `<main class="page atsMinimalLayout"><div class="inner"><header><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(d.basics.headline || '')}</p><p class="muted">${contactLine(d.basics)}</p></header>${sections}</div></main>`,
    `body{background:#fff;font-family:Arial,sans-serif;color:#111}.inner{padding:11.5mm 12mm}header{border-bottom:1.5px solid #111;padding-bottom:7px;margin-bottom:9px}h1{font-size:29px;margin:0}h2{font-size:calc(var(--h3Size) + .5px);letter-spacing:.08em;text-transform:uppercase;border-top:1px solid #222;padding-top:5px;margin-top:9px}h3{font-size:12.2px;margin:0}.muted{font-size:10.8px;color:#444}p,li{font-size:11.4px;line-height:1.44}`
  );
}

export function renderAtsCompactHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const sections = joinSections(d, renderSectionMap(d));
  return doc(
    d,
    `<main class="page atsCompactLayout"><div class="inner"><header><h1>${esc(d.basics.name || 'Your Name')}</h1><div>${contactLine(d.basics)}</div></header>${sections}</div></main>`,
    `body{font-family:Inter,Arial,sans-serif;background:#fff}.inner{padding:10.5mm 12mm}header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:1px solid #ddd;padding-bottom:6px}h1{margin:0;font-size:29px}h2{font-size:calc(var(--h3Size) + .4px);letter-spacing:.09em;text-transform:uppercase;margin:8px 0 5px;color:#111}.item{margin-bottom:5px}.muted{font-size:10.7px;color:#666}`
  );
}

export function renderElegantSerifHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const sections = joinSections(d, renderSectionMap(d));
  return doc(
    d,
    `<main class="page elegantSerifLayout"><div class="inner"><header><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(d.basics.headline || '')}</p></header>${sections}</div></main>`,
    `body{background:#f8fafc;font-family:Georgia,'Times New Roman',serif;color:#1f2937}.inner{padding:12.5mm}header{text-align:center;border-bottom:1px solid #d1d5db;padding-bottom:8px;margin-bottom:9px}h1{margin:0;font-size:33px;line-height:1.08}h2{font-size:calc(var(--h3Size) + .3px);letter-spacing:.11em;text-transform:uppercase;color:#374151}h3{margin:0;font-size:12.4px}p,li{font-size:11.3px;line-height:1.44}`
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
    `body{background:#eef2ff;font-family:var(--fontFamily)}.inner{padding:12.5mm}h1{font-size:calc(var(--h1Size) + 4px);margin:0}h2{font-size:calc(var(--h3Size) + .5px);text-transform:uppercase;letter-spacing:.13em;color:#4338ca}.item{position:relative;padding-left:14px}.item:before{content:'';position:absolute;left:0;top:5px;width:8px;height:8px;border-radius:999px;background:#6366f1}`
  );
}

export function renderCompactOnePagerHtml(draft = {}) {
  const d = normalizeCvDraft(draft);
  const sections = joinSections(d, renderSectionMap(d));
  return doc(
    d,
    `<main class="page compactOnePagerLayout"><div class="inner"><header><h1>${esc(d.basics.name || 'Your Name')}</h1><p>${esc(d.basics.headline || '')}</p><p class="muted">${contactLine(d.basics)}</p></header>${sections}</div></main>`,
    `body{background:#f8fafc;font-family:var(--fontFamily)}.inner{padding:10mm 11mm}header{margin-bottom:7px}h1{margin:0;font-size:28px}h2{margin:7px 0 4px;font-size:11.6px;letter-spacing:.1em;text-transform:uppercase;color:#0f172a}p,li{font-size:11px;line-height:1.42}.item{margin-bottom:3px}.muted{color:#64748b;font-size:10.8px}`
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
};
