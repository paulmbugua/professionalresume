import React, { useMemo } from 'react';
import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';
import { defaultSectionOrder } from '../../../utils/cvDefaults';
import { logScriptProbe, stripScripts } from '../../../utils/sanitizeHtmlForIframe';

type Props = { draft: CvDraft };

const esc = (v: any) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const safeKey = (s?: string | null) => (s ?? '').toString().trim().toLowerCase();

export function renderAtsCompactHtml(draft: CvDraft) {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visibility = draft.sectionVisibility || {};
  const isVisible = (k: CvSectionKey) => visibility[k] !== false;
  const b = draft.basics || {};

  const contact = [b.email, b.phone, b.location]
    .filter(Boolean)
    .map((x) => `<span>${esc(x)}</span>`)
    .join('<span class="sep">•</span>');

  const links = (b.links || [])
    .filter((l) => (l?.label || l?.url)?.trim())
    .map((l) => `${esc(l.label || l.url || '')}${l.url ? ` (${esc(l.url)})` : ''}`)
    .join(' · ');

  const sec = (title: string, inner: string) =>
    inner.trim() ? `<section class="sec"><h2>${esc(title)}</h2>${inner}</section>` : '';

  const summary = draft.summary?.trim() ? `<p>${esc(draft.summary)}</p>` : '';

  const skills = draft.skills?.length
    ? `<div class="skills-grid">${draft.skills.map((s) => `<div>• ${esc(s)}</div>`).join('')}</div>`
    : '';

  const experience = draft.experience?.length
    ? draft.experience
        .map((exp, idx) => {
          const k = [safeKey(exp.company), safeKey(exp.role), idx].join('|');
          const dateLine = `${esc(exp.start || '')}${exp.start || exp.end ? ' – ' : ''}${esc(exp.end || '')}`;
          const bullets = exp.bullets?.length
            ? `<ul>${exp.bullets
                .filter(Boolean)
                .map((b) => `<li>${esc(b)}</li>`)
                .join('')}</ul>`
            : '';
          return `<article class="item" data-k="${esc(k)}"><div class="row"><strong>${esc(exp.role || 'Role')} · ${esc(exp.company || 'Company')}</strong><span class="muted">${dateLine}</span></div><div class="muted">${exp.location ? esc(exp.location) : ''}</div>${bullets}</article>`;
        })
        .join('')
    : '';

  const education = draft.education?.length
    ? draft.education
        .map((edu, idx) => {
          const k = [safeKey(edu.school), safeKey(edu.program), idx].join('|');
          return `<article class="item" data-k="${esc(k)}"><div class="row"><strong>${esc(edu.program || 'Program')}</strong><span class="muted">${esc(edu.start || '')}${edu.start || edu.end ? ' – ' : ''}${esc(edu.end || '')}</span></div><div>${esc(edu.school || 'School')}</div>${edu.details ? `<div class="muted">${esc(edu.details)}</div>` : ''}</article>`;
        })
        .join('')
    : '';

  const projects = draft.projects?.length
    ? draft.projects
        .map(
          (p, idx) =>
            `<article class="item" data-k="${esc(`${safeKey(p.name)}|${idx}`)}"><div class="row"><strong>${esc(p.name || 'Project')}</strong><span class="muted">${p.link ? esc(p.link) : ''}</span></div>${p.description ? `<div>${esc(p.description)}</div>` : ''}${
              p.bullets?.length
                ? `<ul>${p.bullets
                    .filter(Boolean)
                    .map((b) => `<li>${esc(b)}</li>`)
                    .join('')}</ul>`
                : ''
            }</article>`
        )
        .join('')
    : '';

  const certs = draft.certifications?.length
    ? `<ul>${draft.certifications.map((c) => `<li><strong>${esc(c.name || '')}</strong>${c.issuer ? ` · ${esc(c.issuer)}` : ''}${c.year ? ` (${esc(c.year)})` : ''}</li>`).join('')}</ul>`
    : '';

  const extras = draft.extras
    ? `<div>${draft.extras.languages?.length ? `<div><strong>Languages:</strong> ${esc(draft.extras.languages.join(', '))}</div>` : ''}${draft.extras.interests?.length ? `<div><strong>Interests:</strong> ${esc(draft.extras.interests.join(', '))}</div>` : ''}</div>`
    : '';

  const sections: string[] = [];
  order.forEach((k) => {
    if (!isVisible(k)) return;
    if (k === 'summary') sections.push(sec('Summary', summary));
    if (k === 'skills') sections.push(sec('Skills', skills));
    if (k === 'experience') sections.push(sec('Experience', experience));
    if (k === 'education') sections.push(sec('Education', education));
    if (k === 'projects') sections.push(sec('Projects', projects));
    if (k === 'certifications') sections.push(sec('Certifications', certs));
    if (k === 'extras') sections.push(sec('Extras', extras));
  });

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap');
:root{--ink:#0f172a;--muted:#475569;--line:#cbd5e1;--paper:#fff}
*{box-sizing:border-box}
body{margin:0;background:#f1f5f9;font-family:'Source Sans 3',system-ui,Segoe UI,Arial;color:var(--ink)}
.page{width:210mm;min-height:297mm;margin:16px auto;background:var(--paper);padding:13mm 13.5mm;box-shadow:0 12px 30px rgba(2,6,23,.10)}
header{border-bottom:2px solid #0f172a;padding-bottom:8px}
.name{margin:0;font-size:31px;line-height:1.05}.headline{margin:4px 0 0;font-size:14px;color:var(--muted)}
.contact{margin-top:7px;font-size:11.5px;color:var(--muted);display:flex;flex-wrap:wrap;gap:8px}.sep{opacity:.6}
.links{margin-top:4px;font-size:11px;color:var(--muted)}
.sec{margin-top:10px}h2{margin:0 0 5px;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;padding-bottom:4px;border-bottom:1px solid var(--line)}
p,li,div{font-size:11.5px;line-height:1.45}
.skills-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:3px 12px}
.item{margin-bottom:6px}.row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:baseline}.muted{color:var(--muted);font-size:10.6px}
ul{margin:4px 0 0;padding-left:17px}li{margin:2px 0}
@page{size:A4;margin:12mm}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:auto;min-height:auto;padding:0}}
</style>
</head>
<body>
<main class="page">
<header>
  <h1 class="name">${esc(b.name || 'Your Name')}</h1>
  <p class="headline">${esc(b.headline || 'Professional Headline')}</p>
  <div class="contact">${contact}</div>
  ${links ? `<div class="links">${links}</div>` : ''}
</header>
${sections.join('')}
</main>
</body>
</html>`;

  logScriptProbe('ats-compact', html);
  return html;
}

const AtsCompact: React.FC<Props> = ({ draft }) => {
  const html = useMemo(() => renderAtsCompactHtml(draft), [JSON.stringify(draft)]);

  const safeHtml = useMemo(() => stripScripts(html), [html]);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[cv iframe]', { template: 'AtsCompact' });
  }

  return (
    <iframe
      title="ATS Compact"
      className="min-h-full h-full w-full rounded-xl border border-gray-200 bg-white"
      sandbox="allow-same-origin"
      scrolling="yes"
      srcDoc={safeHtml}
      style={{ height: '100%', width: '100%', border: 0 }}
    />
  );
};

export default AtsCompact;
