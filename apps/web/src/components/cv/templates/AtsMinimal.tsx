import React, { useMemo } from 'react';
import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';
import { defaultSectionOrder } from '../../../utils/cvDefaults';

type Props = { draft: CvDraft };

const esc = (v: any) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const safeKey = (s?: string | null) => (s ?? '').toString().trim().toLowerCase();

export function renderAtsMinimalHtml(draft: CvDraft) {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visibility = draft.sectionVisibility || {};
  const isVisible = (k: CvSectionKey) => visibility[k] !== false;

  const basics = draft.basics || {};

  const contact: string[] = [];
  if (basics.email) contact.push(`<span>${esc(basics.email)}</span>`);
  if (basics.phone) contact.push(`<span>${esc(basics.phone)}</span>`);
  if (basics.location) contact.push(`<span>${esc(basics.location)}</span>`);

  const links = (basics.links || [])
    .filter((l) => (l?.label || l?.url)?.trim())
    .map((l, idx) => {
      const label = (l.label || l.url || '').trim();
      const url = (l.url || '').trim();
      const key = `${safeKey(url)}|${safeKey(label)}|${idx}`;
      // ATS-friendly: show label + url in parentheses
      return `<span data-k="${esc(key)}">${esc(label)}${
        url ? ` <span class="muted">(${esc(url)})</span>` : ''
      }</span>`;
    });

  const sectionMap: Record<CvSectionKey, string> = {
    summary: draft.summary?.trim()
      ? `<section><h2 class="sec">Summary</h2><p>${esc(draft.summary)}</p></section>`
      : '',

    skills: draft.skills?.length
      ? `<section><h2 class="sec">Skills</h2><p>${esc(draft.skills.join(' • '))}</p></section>`
      : '',

    experience: draft.experience?.length
      ? `<section>
          <h2 class="sec">Experience</h2>
          <div class="stack">
            ${draft.experience
              .map((exp, idx) => {
                const expKey = [
                  safeKey(exp.company),
                  safeKey(exp.role),
                  safeKey(exp.start),
                  safeKey(exp.end),
                  idx,
                ].join('|');

                const dates = `${esc(exp.start || '')}${exp.start || exp.end ? ' - ' : ''}${esc(
                  exp.end || ''
                )}`.trim();

                const bullets = exp.bullets?.length
                  ? `<ul>
                        ${exp.bullets
                          .filter(Boolean)
                          .map(
                            (b, i) =>
                              `<li data-k="${esc(
                                `${expKey}:b:${i}:${safeKey(b).slice(0, 24)}`
                              )}">${esc(b)}</li>`
                          )
                          .join('')}
                      </ul>`
                  : '';

                return `<div class="item" data-k="${esc(expKey)}">
                  <div class="row">
                    <div class="strong">${esc(exp.role || 'Role')} · ${esc(
                      exp.company || 'Company'
                    )}</div>
                    <div class="dates">${esc(dates)}</div>
                  </div>
                  ${exp.location ? `<div class="muted small">${esc(exp.location)}</div>` : ''}
                  ${bullets}
                </div>`;
              })
              .join('')}
          </div>
        </section>`
      : '',

    education: draft.education?.length
      ? `<section>
          <h2 class="sec">Education</h2>
          <div class="stack">
            ${draft.education
              .map((edu, idx) => {
                const eduKey = [
                  safeKey(edu.school),
                  safeKey(edu.program),
                  safeKey(edu.start),
                  safeKey(edu.end),
                  idx,
                ].join('|');

                const dates = `${esc(edu.start || '')}${edu.start || edu.end ? ' - ' : ''}${esc(
                  edu.end || ''
                )}`.trim();

                return `<div class="item" data-k="${esc(eduKey)}">
                  <div class="row">
                    <div class="strong">${esc(edu.program || 'Program')} · ${esc(
                      edu.school || 'School'
                    )}</div>
                    <div class="dates">${esc(dates)}</div>
                  </div>
                  ${edu.details ? `<div class="muted">${esc(edu.details)}</div>` : ''}
                </div>`;
              })
              .join('')}
          </div>
        </section>`
      : '',

    projects: draft.projects?.length
      ? `<section>
          <h2 class="sec">Projects</h2>
          <div class="stack">
            ${draft.projects
              .map((p, idx) => {
                const projKey = [safeKey(p.name), safeKey(p.link), idx].join('|');

                const bullets = p.bullets?.length
                  ? `<ul>
                        ${p.bullets
                          .filter(Boolean)
                          .map(
                            (b, i) =>
                              `<li data-k="${esc(
                                `${projKey}:b:${i}:${safeKey(b).slice(0, 24)}`
                              )}">${esc(b)}</li>`
                          )
                          .join('')}
                      </ul>`
                  : '';

                return `<div class="item" data-k="${esc(projKey)}">
                  <div class="row">
                    <div class="strong">${esc(p.name || 'Project')}</div>
                    <div class="dates">${
                      p.link ? `<span class="muted">${esc(p.link)}</span>` : ''
                    }</div>
                  </div>
                  ${p.description ? `<div class="muted">${esc(p.description)}</div>` : ''}
                  ${bullets}
                </div>`;
              })
              .join('')}
          </div>
        </section>`
      : '',

    certifications: draft.certifications?.length
      ? `<section>
          <h2 class="sec">Certifications</h2>
          <div class="stack">
            ${draft.certifications
              .map((c, idx) => {
                const certKey = [safeKey(c.name), safeKey(c.issuer), c.year ?? '', idx].join('|');
                const rhs = `${esc(c.issuer || '')}${c.year ? ` • ${esc(c.year)}` : ''}`.trim();

                return `<div class="row item" data-k="${esc(certKey)}">
                  <div>${esc(c.name || '')}</div>
                  <div class="dates muted">${esc(rhs)}</div>
                </div>`;
              })
              .join('')}
          </div>
        </section>`
      : '',

    extras: draft.extras
      ? `<section>
          <h2 class="sec">Extras</h2>
          <div class="muted">
            ${
              draft.extras.languages?.length
                ? `<div><span class="strong">Languages:</span> ${esc(
                    draft.extras.languages.join(', ')
                  )}</div>`
                : ''
            }
            ${
              draft.extras.interests?.length
                ? `<div><span class="strong">Interests:</span> ${esc(
                    draft.extras.interests.join(', ')
                  )}</div>`
                : ''
            }
          </div>
        </section>`
      : '',
  };

  const sections = order
    .map((k) => (isVisible(k) ? sectionMap[k] : ''))
    .filter(Boolean)
    .join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root{
  --text:#0f172a;
  --muted:#475569;
  --hair:#e2e8f0;
  --paper:#ffffff;
}

*{ box-sizing:border-box; }
body{
  margin:0;
  background:#f1f5f9;
  font-family:Inter,system-ui,Segoe UI,Arial;
  color:var(--text);
}

.page{
  width:210mm;
  min-height:297mm;
  margin:18px auto;
  background:var(--paper);
  padding:18mm 16mm;
  box-shadow:0 12px 35px rgba(2,6,23,.10);
}

header{
  border-bottom:1px solid var(--hair);
  padding-bottom:12px;
}

h1{
  margin:0;
  font-size:28px;
  letter-spacing:-.03em;
  line-height:1.1;
}

.headline{
  margin:6px 0 0;
  color:var(--muted);
  font-size:13px;
  font-weight:500;
}

.contact{
  margin-top:10px;
  display:flex;
  flex-wrap:wrap;
  gap:8px 14px;
  color:var(--muted);
  font-size:12px;
}

.contact span{
  position:relative;
  padding-left:10px;
}
.contact span:before{
  content:"•";
  position:absolute;
  left:0;
  color:#94a3b8;
}

.sec{
  margin:16px 0 8px;
  font-size:11px;
  text-transform:uppercase;
  letter-spacing:.12em;
  font-weight:700;
  color:#0f172a;
}

.stack{ display:flex; flex-direction:column; gap:12px; }

.row{
  display:grid;
  grid-template-columns:1fr auto;
  gap:12px;
  align-items:baseline;
}

.strong{ font-weight:700; }
.dates{
  font-size:11px;
  color:var(--muted);
  white-space:nowrap;
  text-align:right;
}

.muted{ color:var(--muted); }
.small{ font-size:11px; }

p{ margin:0; font-size:12px; line-height:1.55; }

ul{
  margin:8px 0 0;
  padding-left:18px;
  font-size:12px;
  line-height:1.5;
}
li{ margin:4px 0; }

@page{ size:A4; margin:14mm; }
@media print{
  body{ background:#fff; }
  .page{ margin:0; padding:0; box-shadow:none; width:auto; min-height:auto; }
}
</style>
</head>
<body>
  <main class="page">
    <header>
      <h1>${esc(basics.name || 'Your Name')}</h1>
      <div class="headline">${esc(basics.headline || 'Professional Headline')}</div>
      <div class="contact">
        ${contact.join('')}
        ${links.join('')}
      </div>
    </header>

    ${sections}
  </main>
</body>
</html>`;
}

const AtsMinimal: React.FC<Props> = ({ draft }) => {
  const html = useMemo(() => renderAtsMinimalHtml(draft), [JSON.stringify(draft)]);

  return (
    <iframe
      title="ATS Minimal"
      className="min-h-full h-full w-full rounded-xl border border-gray-200 bg-white"
      sandbox="allow-same-origin"
      scrolling="yes"
      srcDoc={html}
      style={{ height: '100%', width: '100%', border: 0 }}
    />
  );
};

export default AtsMinimal;
