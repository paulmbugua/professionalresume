// apps/web/src/components/cv/templates/BoldHeader.tsx
import React from 'react';
import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';
import { defaultSectionOrder } from '../../../utils/cvDefaults';
import { resolveDraftStyles } from '../../../utils/cvStyleTokens';
import { renderRichText, renderRichTextReact } from '../../../utils/cvRichText';

type Props = {
  draft: CvDraft;
};

const esc = (v: any) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const safeKey = (s?: string | null) => (s ?? '').toString().trim().toLowerCase();

/**
 * HTML renderer used by TemplateThumbnail (iframe srcDoc).
 * Tailwind classes do NOT exist inside srcDoc, so this returns a full HTML document with inline CSS.
 */
export function renderBoldHeaderHtml(draft: CvDraft) {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visibility = draft.sectionVisibility || {};
  const isVisible = (k: CvSectionKey) => visibility[k] !== false;

  const b = draft.basics || {};
  const { cssVarBlock } = resolveDraftStyles(draft);

  const name = esc(b.name || 'Your Name');
  const headline = esc(b.headline || 'Professional Headline');
  const email = esc(b.email || '');
  const phone = esc(b.phone || '');
  const location = esc(b.location || '');

  const contactBits = [email, phone, location].filter(Boolean);

  const links = (b.links || [])
    .filter((l) => (l?.label || l?.url)?.trim())
    .map((l, idx) => {
      const label = (l.label || l.url || '').trim();
      const url = (l.url || '').trim();
      const key = `${safeKey(url)}|${safeKey(label)}|${idx}`;
      return `<span data-k="${esc(key)}">${esc(label)}${
        url ? ` <span class="mutedText">(${esc(url)})</span>` : ''
      }</span>`;
    });

  const sectionHtml: Record<CvSectionKey, string> = {
    summary:
      draft.summary?.trim() || draft.richText?.summary?.trim()
        ? `<section class="card muted">
          <h3 class="title">Summary</h3>
          <p class="body">${renderRichText(draft, 'summary', draft.summary || '')}</p>
        </section>`
        : '',

    skills: draft.skills?.length
      ? `<section class="card muted">
          <h3 class="title">Skills</h3>
          <div class="chips">
            ${draft.skills
              .filter(Boolean)
              .map((s) => `<span class="chip">${esc(s)}</span>`)
              .join('')}
          </div>
        </section>`
      : '',

    experience: draft.experience?.length
      ? `<section class="card">
          <h3 class="title">Experience</h3>
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

                const role = esc(exp.role || 'Role');
                const company = esc(exp.company || 'Company');
                const dates = `${esc(exp.start || '')}${exp.start || exp.end ? ' - ' : ''}${esc(
                  exp.end || ''
                )}`.trim();

                const bullets = exp.bullets?.length
                  ? `<ul class="list">
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
                    <div class="strong">${role} · ${company}</div>
                    <div class="dates">${esc(dates)}</div>
                  </div>
                  ${bullets}
                </div>`;
              })
              .join('')}
          </div>
        </section>`
      : '',

    education: draft.education?.length
      ? `<section class="card">
          <h3 class="title">Education</h3>
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

                const program = esc(edu.program || 'Program');
                const school = esc(edu.school || 'School');
                const dates = `${esc(edu.start || '')}${edu.start || edu.end ? ' - ' : ''}${esc(
                  edu.end || ''
                )}`.trim();

                return `<div class="item" data-k="${esc(eduKey)}">
                  <div class="row">
                    <div class="strong">${program} · ${school}</div>
                    <div class="dates">${esc(dates)}</div>
                  </div>
                  ${edu.details ? `<div class="mutedText">${esc(edu.details)}</div>` : ''}
                </div>`;
              })
              .join('')}
          </div>
        </section>`
      : '',

    projects: draft.projects?.length
      ? `<section class="card">
          <h3 class="title">Projects</h3>
          <div class="stack">
            ${draft.projects
              .map((p, idx) => {
                const projKey = [safeKey(p.name), safeKey(p.link), idx].join('|');

                const pname = esc(p.name || 'Project');
                const desc = esc(p.description || '');

                const bullets = p.bullets?.length
                  ? `<ul class="list">
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
                  <div class="strong">${pname}</div>
                  ${desc ? `<div class="mutedText">${desc}</div>` : ''}
                  ${bullets}
                </div>`;
              })
              .join('')}
          </div>
        </section>`
      : '',

    certifications: draft.certifications?.length
      ? `<section class="card muted">
          <h3 class="title">Certifications</h3>
          <div class="stack">
            ${draft.certifications
              .map((c, idx) => {
                const certKey = [safeKey(c.name), safeKey(c.issuer), c.year ?? '', idx].join('|');
                const rhs = `${esc(c.issuer || '')}${c.year ? ` • ${esc(c.year)}` : ''}`.trim();
                return `<div class="row item" data-k="${esc(certKey)}">
                  <div class="strong">${esc(c.name || '')}</div>
                  <div class="dates">${esc(rhs)}</div>
                </div>`;
              })
              .join('')}
          </div>
        </section>`
      : '',

    extras: draft.extras
      ? `<section class="card muted">
          <h3 class="title">Extras</h3>
          <div class="mutedText">
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
    .map((k) => (isVisible(k) ? sectionHtml[k] : ''))
    .filter(Boolean)
    .join('\n');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  :root{ --text:#0f172a; --muted:#475569; --border:#e5e7eb; --soft:#f8fafc; }
  *{ box-sizing:border-box; }
  body{ margin:0; background:#fff; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--text); }
  .wrap{ padding:28px; }
  .hero{ border-radius:18px; padding:18px 18px 14px; background:var(--headerBg); color:var(--headerText); }
  .hero h1{ margin:0; font-size:26px; line-height:1.1; letter-spacing:-0.02em; }
  .hero .sub{ margin:6px 0 0; font-size:12px; color:#cbd5e1; }
  .meta{ margin-top:10px; display:flex; flex-wrap:wrap; gap:10px 16px; font-size:11px; color:#94a3b8; }
  .meta span{ white-space:nowrap; }
  .grid{ margin-top:16px; display:grid; gap:12px; }
  .card{ border:1px solid var(--border); border-radius:14px; padding:12px; background:#fff; }
  .card.muted{ background:var(--soft); }
  .title{ margin:0 0 8px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; }
  .body{ margin:0; font-size:12px; line-height:1.5; color:var(--muted); }
  .chips{ display:flex; flex-wrap:wrap; gap:6px; }
  .chip{ background:#fff; border:1px solid var(--border); border-radius:999px; padding:4px 8px; font-size:10px; font-weight:600; color:#334155; }
  .stack{ display:flex; flex-direction:column; gap:10px; }
  .item{ }
  .row{ display:flex; justify-content:space-between; gap:10px; align-items:baseline; }
  .strong{ font-weight:700; font-size:12px; }
  .dates{ font-size:11px; color:var(--muted); white-space:nowrap; text-align:right; }
  .mutedText{ font-size:11px; color:var(--muted); }
  .list{ margin:8px 0 0; padding-left:18px; font-size:11px; color:var(--muted); line-height:1.45; }
  .list li{ margin:4px 0; }
</style>
</head>
<body>
  <div class="wrap">
    <header class="hero">
      <h1>${name}</h1>
      <div class="sub">${headline}</div>
      <div class="meta">
        ${contactBits.map((c) => `<span>${c}</span>`).join('')}
        ${links.join('')}
      </div>
    </header>

    <main class="grid">
      ${sections}
    </main>
  </div>
</body>
</html>`;
}

const BoldHeader: React.FC<Props> = ({ draft }) => {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visible = draft.sectionVisibility || {};
  const isVisible = (k: CvSectionKey) => visible[k] !== false;

  const sectionMap: Record<CvSectionKey, React.ReactNode> = {
    summary:
      draft.summary || draft.richText?.summary ? (
        <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h3 className="cv-section-title">Summary</h3>
          <p
            className="cv-body"
            dangerouslySetInnerHTML={renderRichTextReact(draft, 'summary', draft.summary || '')}
          />
        </section>
      ) : null,

    skills: draft.skills?.length ? (
      <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <h3 className="cv-section-title">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {draft.skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-gray-700"
            >
              {skill}
            </span>
          ))}
        </div>
      </section>
    ) : null,

    experience: draft.experience?.length ? (
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="cv-section-title">Experience</h3>
        <div className="space-y-4">
          {draft.experience.map((exp, idx) => (
            <div key={`${exp.company}-${idx}`} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between text-sm font-semibold">
                <span>
                  {exp.role || 'Role'} · {exp.company || 'Company'}
                </span>
                <span className="text-xs text-gray-500">
                  {exp.start} - {exp.end}
                </span>
              </div>
              {exp.location ? <div className="text-xs text-gray-500">{exp.location}</div> : null}
              <ul className="list-disc space-y-1 pl-4 text-xs text-gray-600">
                {exp.bullets?.filter(Boolean).map((bullet, bulletIdx) => (
                  <li key={`${exp.company}-${bulletIdx}`}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    education: draft.education?.length ? (
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="cv-section-title">Education</h3>
        <div className="space-y-3">
          {draft.education.map((edu, idx) => (
            <div key={`${edu.school}-${idx}`}>
              <div className="flex flex-wrap items-center justify-between text-sm font-semibold">
                <span>
                  {edu.program || 'Program'} · {edu.school || 'School'}
                </span>
                <span className="text-xs text-gray-500">
                  {edu.start} - {edu.end}
                </span>
              </div>
              {edu.details && <p className="text-xs text-gray-600">{edu.details}</p>}
            </div>
          ))}
        </div>
      </section>
    ) : null,

    projects: draft.projects?.length ? (
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="cv-section-title">Projects</h3>
        <div className="space-y-3">
          {draft.projects.map((project, idx) => (
            <div key={`${project.name}-${idx}`}>
              <div className="text-sm font-semibold">{project.name || 'Project'}</div>
              {project.description ? (
                <p className="text-xs text-gray-600">{project.description}</p>
              ) : null}
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-gray-600">
                {project.bullets?.filter(Boolean).map((bullet, bulletIdx) => (
                  <li key={`${project.name}-${bulletIdx}`}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    certifications: draft.certifications?.length ? (
      <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <h3 className="cv-section-title">Certifications</h3>
        <div className="space-y-1 text-xs text-gray-600">
          {draft.certifications.map((cert, idx) => (
            <div key={`${cert.name}-${idx}`} className="flex items-center justify-between gap-3">
              <span className="font-semibold">{cert.name}</span>
              <span className="text-gray-500">
                {cert.issuer} {cert.year ? `• ${cert.year}` : ''}
              </span>
            </div>
          ))}
        </div>
      </section>
    ) : null,

    extras: draft.extras ? (
      <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <h3 className="cv-section-title">Extras</h3>
        <div className="space-y-1 text-xs text-gray-600">
          {draft.extras.languages?.length ? (
            <p>Languages: {draft.extras.languages.join(', ')}</p>
          ) : null}
          {draft.extras.interests?.length ? (
            <p>Interests: {draft.extras.interests.join(', ')}</p>
          ) : null}
        </div>
      </section>
    ) : null,
  };

  const { cssVars } = resolveDraftStyles(draft);

  return (
    <div className="p-8" style={cssVars as React.CSSProperties}>
      <header
        className="rounded-2xl p-6"
        style={{ backgroundColor: 'var(--headerBg)', color: 'var(--headerText)' }}
      >
        <h1 className="text-3xl font-semibold">{draft.basics?.name || 'Your Name'}</h1>
        <p className="text-sm text-slate-200">
          {draft.basics?.headline || 'Professional Headline'}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
          {draft.basics?.email ? <span>{draft.basics.email}</span> : null}
          {draft.basics?.phone ? <span>{draft.basics.phone}</span> : null}
          {draft.basics?.location ? <span>{draft.basics.location}</span> : null}
        </div>
      </header>

      <div className="mt-6 grid gap-4">
        {order.map((key) => (isVisible(key) ? sectionMap[key] : null))}
      </div>
    </div>
  );
};

export default BoldHeader;
