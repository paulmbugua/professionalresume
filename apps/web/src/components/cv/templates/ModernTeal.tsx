import React, { useMemo } from 'react';
import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';
import { defaultSectionOrder } from '../../../utils/cvDefaults';
import { logScriptProbe, stripScripts } from '../../../utils/sanitizeHtmlForIframe';
import { resolveDraftStyles } from '../../../utils/cvStyleTokens';

type Props = { draft: CvDraft };

const esc = (v: any) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const safeKey = (s?: string | null) => (s ?? '').toString().trim().toLowerCase();

export function renderModernTealHtml(draft: CvDraft) {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visibility = draft.sectionVisibility || {};
  const isVisible = (k: CvSectionKey) => visibility[k] !== false;

  const b = draft.basics || {};
  const { cssVarBlock } = resolveDraftStyles(draft);
  const contactBits: string[] = [];
  if (b.phone)
    contactBits.push(
      `<div class="c-line"><span class="c-label">Phone</span> ${esc(b.phone)}</div>`
    );
  if (b.email)
    contactBits.push(
      `<div class="c-line"><span class="c-label">Email</span> ${esc(b.email)}</div>`
    );
  if (b.location)
    contactBits.push(
      `<div class="c-line"><span class="c-label">Location</span> ${esc(b.location)}</div>`
    );

  const links = (b.links || [])
    .filter((l) => (l?.label || l?.url)?.trim())
    .map((l, idx) => {
      const label = (l.label || l.url || '').trim();
      const url = (l.url || '').trim();
      const key = `${safeKey(url)}|${safeKey(label)}|${idx}`;
      return `<div class="c-line" data-k="${esc(key)}"><span class="c-label">${esc(label)}</span> ${url ? esc(url) : ''}</div>`;
    });

  const sec = (title: string, inner: string) =>
    inner.trim()
      ? `<section class="sec"><h2 class="sec-title">${esc(title)}</h2>${inner}</section>`
      : '';

  const summary = draft.summary?.trim() ? `<p class="p">${esc(draft.summary)}</p>` : '';

  const skills = draft.skills?.length
    ? `<ul class="pill-list">${draft.skills.map((s) => `<li class="pill">${esc(s)}</li>`).join('')}</ul>`
    : '';

  const education = draft.education?.length
    ? `<div class="stack">
        ${draft.education
          .map((edu, idx) => {
            const k = [
              safeKey(edu.school),
              safeKey(edu.program),
              safeKey(edu.start),
              safeKey(edu.end),
              idx,
            ].join('|');
            const dates =
              `${esc(edu.start || '')}${edu.start || edu.end ? ' – ' : ''}${esc(edu.end || '')}`.trim();
            return `<div class="item" data-k="${esc(k)}">
              <div class="row">
                <div class="strong">${esc(edu.program || 'Program')}</div>
                <div class="muted">${esc(dates)}</div>
              </div>
              <div class="small">${esc(edu.school || 'School')}</div>
              ${edu.details ? `<div class="small">${esc(edu.details)}</div>` : ''}
            </div>`;
          })
          .join('')}
      </div>`
    : '';

  const experience = draft.experience?.length
    ? `<div class="stack">
        ${draft.experience
          .map((exp, idx) => {
            const k = [
              safeKey(exp.company),
              safeKey(exp.role),
              safeKey(exp.start),
              safeKey(exp.end),
              idx,
            ].join('|');
            const dates =
              `${esc(exp.start || '')}${exp.start || exp.end ? ' – ' : ''}${esc(exp.end || '')}`.trim();
            const bullets = exp.bullets?.length
              ? `<ul class="bullets">${exp.bullets
                  .filter(Boolean)
                  .map((x) => `<li>${esc(x)}</li>`)
                  .join('')}</ul>`
              : '';
            return `<div class="item" data-k="${esc(k)}">
              <div class="row">
                <div class="strong">${esc(exp.role || 'Role')}</div>
                <div class="muted">${esc(dates)}</div>
              </div>
              <div class="small">${esc(exp.company || 'Company')}${exp.location ? ` • ${esc(exp.location)}` : ''}</div>
              ${bullets}
            </div>`;
          })
          .join('')}
      </div>`
    : '';

  const projects = draft.projects?.length
    ? `<div class="stack">
        ${draft.projects
          .map((p, idx) => {
            const k = [safeKey(p.name), safeKey(p.link), idx].join('|');
            const bullets = p.bullets?.length
              ? `<ul class="bullets">${p.bullets
                  .filter(Boolean)
                  .map((x) => `<li>${esc(x)}</li>`)
                  .join('')}</ul>`
              : '';
            return `<div class="item" data-k="${esc(k)}">
              <div class="row">
                <div class="strong">${esc(p.name || 'Project')}</div>
                <div class="muted">${p.link ? esc(p.link) : ''}</div>
              </div>
              ${p.description ? `<div class="small">${esc(p.description)}</div>` : ''}
              ${bullets}
            </div>`;
          })
          .join('')}
      </div>`
    : '';

  const certs = draft.certifications?.length
    ? `<ul class="list">
        ${draft.certifications
          .map((c) => {
            const rhs = `${esc(c.issuer || '')}${c.year ? ` • ${esc(c.year)}` : ''}`.trim();
            return `<li><span class="strong">${esc(c.name || '')}</span>${rhs ? ` <span class="small">(${rhs})</span>` : ''}</li>`;
          })
          .join('')}
      </ul>`
    : '';

  const extras = draft.extras
    ? `<div class="stack">
        ${draft.extras.languages?.length ? `<div><span class="strong">Languages:</span> ${esc(draft.extras.languages.join(', '))}</div>` : ''}
        ${draft.extras.interests?.length ? `<div><span class="strong">Interests:</span> ${esc(draft.extras.interests.join(', '))}</div>` : ''}
      </div>`
    : '';

  const leftSections: string[] = [];
  const rightSections: string[] = [];

  const pushSection = (k: CvSectionKey) => {
    if (!isVisible(k)) return;
    if (k === 'summary') leftSections.push(sec('Summary', summary));
    else if (k === 'skills') leftSections.push(sec('Skills', skills));
    else if (k === 'education') leftSections.push(sec('Education', education));
    else if (k === 'experience') rightSections.push(sec('Professional Experience', experience));
    else if (k === 'projects') rightSections.push(sec('Projects', projects));
    else if (k === 'certifications') rightSections.push(sec('Certifications', certs));
    else if (k === 'extras') leftSections.push(sec('Extras', extras));
  };

  order.forEach(pushSection);

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${cssVarBlock}
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
:root{--text:var(--textColor);--muted:var(--mutedTextColor);--hair:var(--borderColor);--paper:#fff;--accent:var(--accent);--accent2:var(--primary)}
*{box-sizing:border-box}
body{margin:0;background:#f1f5f9;font-family:var(--fontFamily);font-size:var(--baseFontSize);color:var(--text)}
.page{width:210mm;min-height:297mm;margin:18px auto;background:var(--paper);padding:13mm;box-shadow:0 12px 35px rgba(2,6,23,.10)}
.name{font-size:31px;font-weight:800;letter-spacing:-.03em;margin:0}
.headline{margin:6px 0 0;color:var(--muted);font-size:13.5px;font-weight:500}
.accent-bar{height:6px;background:var(--accent);margin:12px 0 0}
.grid{display:grid;grid-template-columns:70mm 1fr;gap:11mm;margin-top:11mm}
.card{border:1px solid var(--hair);border-radius:10px;padding:10px 12px;background:#f8fafc}
.c-title,.sec-title{font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:var(--accent2);margin:0 0 8px}
.c-line{font-size:11.4px;margin:5px 0}.c-label{display:inline-block;min-width:62px;color:var(--muted);font-weight:600}
.sec{margin:0 0 11px}.sec-title{padding-bottom:6px;border-bottom:2px solid rgba(14,165,165,.35)}
.p{margin:0;font-size:11.5px;line-height:1.5}.stack{display:flex;flex-direction:column;gap:8px}
.row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:baseline}
.strong{font-weight:800}.muted{color:var(--muted);font-size:10.7px;white-space:nowrap;text-align:right}
.small{color:var(--muted);font-size:11.3px;line-height:1.45;margin-top:4px}
.bullets{margin:7px 0 0;padding-left:18px;font-size:11.3px;line-height:1.45}.bullets li{margin:3px 0}
.pill-list{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:6px}
.pill{border:1px solid rgba(14,165,165,.35);background:#fff;border-radius:999px;padding:4px 10px;font-size:10.8px;font-weight:600}
.list{margin:0;padding-left:18px;font-size:11.4px;line-height:1.45}
@page{size:A4;margin:12mm}
@media print{body{background:#fff}.page{margin:0;padding:0;width:auto;min-height:auto;box-shadow:none}}
</style>
</head>
<body>
  <main class="page">
    <h1 class="name">${esc(b.name || 'Your Name')}</h1>
    <div class="headline">${esc(b.headline || 'Professional Headline')}</div>
    <div class="accent-bar"></div>
    <div class="grid">
      <aside>
        <div class="card">
          <p class="c-title">Contact</p>
          ${contactBits.join('')}
          ${links.join('')}
        </div>
        <div style="height:10px"></div>
        ${leftSections.join('')}
      </aside>
      <section>${rightSections.join('')}</section>
    </div>
  </main>
</body>
</html>`;

  logScriptProbe('modern-teal', html);
  return html;
}

const ModernTeal: React.FC<Props> = ({ draft }) => {
  const html = useMemo(() => renderModernTealHtml(draft), [JSON.stringify(draft)]);

  const safeHtml = useMemo(() => stripScripts(html), [html]);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[cv iframe]', { template: 'ModernTeal' });
  }

  return (
    <iframe
      title="Modern Teal"
      className="min-h-full h-full w-full rounded-xl border border-gray-200 bg-white"
      sandbox="allow-same-origin"
      scrolling="yes"
      srcDoc={safeHtml}
      style={{ height: '100%', width: '100%', border: 0 }}
    />
  );
};

export default ModernTeal;
