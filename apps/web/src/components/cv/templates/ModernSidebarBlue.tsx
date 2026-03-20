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

function initials(name?: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'YN';
  return `${parts[0][0] || ''}${parts.length > 1 ? parts[parts.length - 1][0] || '' : ''}`.toUpperCase();
}

export function renderModernSidebarBlueHtml(draft: CvDraft) {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visibility = draft.sectionVisibility || {};
  const isVisible = (k: CvSectionKey) => visibility[k] !== false;

  const b = draft.basics || {};
  const { cssVarBlock } = resolveDraftStyles(draft);

  const contact = [
    b.email ? `<div>${esc(b.email)}</div>` : '',
    b.phone ? `<div>${esc(b.phone)}</div>` : '',
    b.location ? `<div>${esc(b.location)}</div>` : '',
    ...(b.links || [])
      .filter((l) => (l?.label || l?.url)?.trim())
      .map((l) => `<div>${esc(l.label || l.url || '')}${l.url ? ` · ${esc(l.url)}` : ''}</div>`),
  ]
    .filter(Boolean)
    .join('');

  const skills = (draft.skills || [])
    .filter(Boolean)
    .map((s) => `<li>${esc(s)}</li>`)
    .join('');

  const languages = (draft.extras?.languages || [])
    .filter(Boolean)
    .map((s) => `<li>${esc(s)}</li>`)
    .join('');

  const summary = draft.summary?.trim() ? `<p class="p">${esc(draft.summary)}</p>` : '';

  const experience = draft.experience?.length
    ? draft.experience
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
                .map((b) => `<li>${esc(b)}</li>`)
                .join('')}</ul>`
            : '';
          return `<article class="item" data-k="${esc(k)}"><h4>${esc(exp.role || 'Role')} · ${esc(exp.company || 'Company')}</h4><div class="meta">${esc(dates)}${exp.location ? ` · ${esc(exp.location)}` : ''}</div>${bullets}</article>`;
        })
        .join('')
    : '';

  const education = draft.education?.length
    ? draft.education
        .map((edu, idx) => {
          const k = [safeKey(edu.school), safeKey(edu.program), idx].join('|');
          return `<article class="item" data-k="${esc(k)}"><h4>${esc(edu.program || 'Program')}</h4><div class="meta">${esc(edu.school || 'School')} · ${esc(edu.start || '')}${edu.start || edu.end ? ' – ' : ''}${esc(edu.end || '')}</div>${edu.details ? `<p class="small">${esc(edu.details)}</p>` : ''}</article>`;
        })
        .join('')
    : '';

  const certs = draft.certifications?.length
    ? `<ul class="text-list">${draft.certifications.map((c) => `<li><strong>${esc(c.name || '')}</strong>${c.issuer ? ` · ${esc(c.issuer)}` : ''}${c.year ? ` (${esc(c.year)})` : ''}</li>`).join('')}</ul>`
    : '';

  const projects = draft.projects?.length
    ? draft.projects
        .map(
          (p, idx) =>
            `<article class="item" data-k="${esc(`${safeKey(p.name)}|${idx}`)}"><h4>${esc(p.name || 'Project')}</h4>${p.description ? `<p class="small">${esc(p.description)}</p>` : ''}${
              p.bullets?.length
                ? `<ul class="bullets">${p.bullets
                    .filter(Boolean)
                    .map((b) => `<li>${esc(b)}</li>`)
                    .join('')}</ul>`
                : ''
            }</article>`
        )
        .join('')
    : '';

  const section = (title: string, inner: string) =>
    inner.trim() ? `<section class="sec"><h3>${esc(title)}</h3>${inner}</section>` : '';

  const mainSections: string[] = [];
  order.forEach((k) => {
    if (!isVisible(k)) return;
    if (k === 'summary') mainSections.push(section('Profile', summary));
    if (k === 'experience') mainSections.push(section('Experience', experience));
    if (k === 'education') mainSections.push(section('Education', education));
    if (k === 'projects') mainSections.push(section('Projects', projects));
    if (k === 'certifications') mainSections.push(section('Certifications', certs));
  });

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
${cssVarBlock}
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
:root{--paper:#fff;--ink:var(--textColor);--muted:var(--mutedTextColor);--accent:var(--accent);--sideText:var(--sidebarText)}
*{box-sizing:border-box}
body{margin:0;background:#e2e8f0;font-family:Poppins,system-ui,Segoe UI,Arial;color:var(--ink)}
.page{width:210mm;min-height:297mm;margin:18px auto;background:var(--paper);display:grid;grid-template-columns:72mm 1fr;box-shadow:0 12px 35px rgba(2,6,23,.12)}
aside{background:linear-gradient(180deg,var(--sidebarBg),var(--primary));color:var(--sidebarText);padding:12mm}
.avatar{width:78px;height:78px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.2);display:grid;place-items:center;font-size:27px;font-weight:700;margin-bottom:12px}
.avatar-img{width:100%;height:100%;object-fit:cover;display:block}
.side-name{font-size:23px;line-height:1.14;font-weight:700;margin:0 0 3px}.side-headline{margin:0 0 13px;color:var(--sideText);font-size:11.5px}
.s-title{margin:0 0 8px;font-size:10.7px;letter-spacing:.14em;text-transform:uppercase;color:color-mix(in srgb, var(--sidebarText) 78%, white 22%);font-weight:700}
.s-block{margin:0 0 13px}.s-block div,.s-block li{font-size:11.2px;line-height:1.45;color:var(--sidebarText)}
main{padding:11.5mm 12.5mm}.name{margin:0;font-size:31px;letter-spacing:-.02em}.headline{margin:6px 0 0;color:var(--muted);font-size:13.5px}
.sec{margin:0 0 11px}h3{margin:0 0 6px;font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid color-mix(in srgb, var(--accent) 22%, white 78%);padding-bottom:5px;color:var(--accent)}
.p{margin:0;font-size:11.6px;line-height:1.55}
.item{margin-bottom:8px}.item h4{margin:0;font-size:12.6px}.meta{font-size:10.7px;color:var(--muted)}.small{margin:4px 0 0;color:#334155;font-size:11.4px;line-height:1.45}
.bullets{margin:6px 0 0;padding-left:18px}.bullets li{font-size:11.3px;line-height:1.45;margin:2px 0}
.text-list{margin:0;padding-left:18px}.text-list li{font-size:11.4px;line-height:1.45;margin:2px 0}
@page{size:A4;margin:12mm}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;width:auto;min-height:auto}}
</style>
</head>
<body>
<main class="page">
  <aside>
    <div class="avatar">${b.photoUrl ? `<img class="avatar-img" src="${esc(b.photoUrl)}" alt="Profile photo" />` : esc(initials(b.name))}</div>
    <p class="side-name">${esc(b.name || 'Your Name')}</p>
    <p class="side-headline">${esc(b.headline || 'Professional Headline')}</p>
    <section class="s-block"><p class="s-title">Contact</p>${contact || '<div>Add contact details</div>'}</section>
    ${skills ? `<section class="s-block"><p class="s-title">Skills</p><ul>${skills}</ul></section>` : ''}
    ${languages ? `<section class="s-block"><p class="s-title">Languages</p><ul>${languages}</ul></section>` : ''}
  </aside>
  <main>
    <h1 class="name">${esc(b.name || 'Your Name')}</h1>
    <p class="headline">${esc(b.headline || 'Professional Headline')}</p>
    <div style="height:10px"></div>
    ${mainSections.join('')}
  </main>
</main>
</body>
</html>`;

  logScriptProbe('modern-sidebar-blue', html);
  return html;
}

const ModernSidebarBlue: React.FC<Props> = ({ draft }) => {
  const html = useMemo(() => renderModernSidebarBlueHtml(draft), [JSON.stringify(draft)]);

  const safeHtml = useMemo(() => stripScripts(html), [html]);

  if (process.env.NODE_ENV !== 'production') {
    console.log('[cv iframe]', { template: 'ModernSidebarBlue' });
  }

  return (
    <iframe
      title="Modern Blue Sidebar"
      className="min-h-full h-full w-full rounded-xl border border-gray-200 bg-white"
      sandbox="allow-same-origin"
      scrolling="yes"
      srcDoc={safeHtml}
      style={{ height: '100%', width: '100%', border: 0 }}
    />
  );
};

export default ModernSidebarBlue;
