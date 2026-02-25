import React from 'react';
import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';
import { defaultSectionOrder } from '../../../utils/cvDefaults';

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

export function renderCompactOnePagerHtml(draft: CvDraft): string {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visibility = draft.sectionVisibility || {};
  const isVisible = (k: CvSectionKey) => visibility[k] !== false;
  const b = draft.basics || {};

  const contact = [b.email, b.phone, b.location].filter(Boolean).map((item) => `<span>${esc(item)}</span>`);
  const links = (b.links || [])
    .filter((l) => (l?.label || l?.url)?.trim())
    .map((l, idx) => `<span data-k="${esc(`${safeKey(l.label || l.url)}|${idx}`)}">${esc(l.label || l.url || '')}</span>`);

  const sectionMap: Record<CvSectionKey, string> = {
    summary: draft.summary?.trim() ? `<section><h2>Summary</h2><p>${esc(draft.summary)}</p></section>` : '',
    skills: draft.skills?.length
      ? `<section><h2>Skills</h2><p>${esc(draft.skills.join(' • '))}</p></section>`
      : '',
    experience: draft.experience?.length
      ? `<section><h2>Experience</h2><div class="stack">${draft.experience
          .map((exp, idx) => {
            const bullets = exp.bullets?.length
              ? `<ul>${exp.bullets.filter(Boolean).map((bullet) => `<li>${esc(bullet)}</li>`).join('')}</ul>`
              : '';
            return `<article data-k="${esc(`${safeKey(exp.company)}|${safeKey(exp.role)}|${idx}`)}"><div class="row"><strong>${esc(exp.role || 'Role')} · ${esc(exp.company || 'Company')}</strong><span>${esc(exp.start || '')}${exp.start || exp.end ? ' - ' : ''}${esc(exp.end || '')}</span></div>${bullets}</article>`;
          })
          .join('')}</div></section>`
      : '',
    education: draft.education?.length
      ? `<section><h2>Education</h2><div class="stack">${draft.education
          .map(
            (edu, idx) =>
              `<article data-k="${esc(`${safeKey(edu.school)}|${safeKey(edu.program)}|${idx}`)}"><div class="row"><strong>${esc(edu.program || 'Program')}</strong><span>${esc(edu.start || '')}${edu.start || edu.end ? ' - ' : ''}${esc(edu.end || '')}</span></div><p>${esc(edu.school || 'School')}${edu.details ? ` — ${esc(edu.details)}` : ''}</p></article>`
          )
          .join('')}</div></section>`
      : '',
    projects: draft.projects?.length
      ? `<section><h2>Projects</h2><div class="stack">${draft.projects
          .map((project, idx) => `<article data-k="${esc(`${safeKey(project.name)}|${idx}`)}"><strong>${esc(project.name || 'Project')}</strong>${project.description ? `<p>${esc(project.description)}</p>` : ''}</article>`)
          .join('')}</div></section>`
      : '',
    certifications: draft.certifications?.length
      ? `<section><h2>Certifications</h2><div class="stack">${draft.certifications
          .map((cert, idx) => `<p data-k="${esc(`${safeKey(cert.name)}|${idx}`)}"><strong>${esc(cert.name || '')}</strong>${cert.issuer ? ` · ${esc(cert.issuer)}` : ''}${cert.year ? ` (${esc(cert.year)})` : ''}</p>`)
          .join('')}</div></section>`
      : '',
    extras: draft.extras
      ? `<section><h2>Extras</h2>${draft.extras.languages?.length ? `<p><strong>Languages:</strong> ${esc(draft.extras.languages.join(', '))}</p>` : ''}${draft.extras.interests?.length ? `<p><strong>Interests:</strong> ${esc(draft.extras.interests.join(', '))}</p>` : ''}</section>`
      : '',
  };

  const sections = order
    .map((k) => (isVisible(k) ? sectionMap[k] : ''))
    .filter(Boolean)
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#f8fafc;font-family:Inter,system-ui,Arial;color:#0f172a}
  .page{width:210mm;min-height:297mm;margin:10px auto;background:#fff;padding:12mm;box-shadow:0 8px 24px rgba(2,6,23,.10)}
  header{text-align:center;border-bottom:1px solid #e2e8f0;padding-bottom:8px}
  h1{margin:0;font-size:24px;line-height:1.1}
  .headline{margin-top:3px;color:#475569;font-size:12px}
  .meta{margin-top:6px;display:flex;flex-wrap:wrap;justify-content:center;gap:6px 12px;font-size:10px;color:#64748b}
  main{display:grid;gap:10px;margin-top:10px}
  h2{margin:0 0 4px;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
  p{margin:0;font-size:10px;line-height:1.35;color:#475569}
  .stack{display:grid;gap:6px}
  .row{display:flex;justify-content:space-between;gap:8px;align-items:baseline;font-size:10px}
  strong{font-size:10px;color:#0f172a}
  ul{margin:4px 0 0;padding-left:16px;font-size:10px;line-height:1.35;color:#475569}
  li{margin:2px 0}
  @page{size:A4;margin:10mm}
</style>
</head>
<body>
  <div class="page">
    <header>
      <h1>${esc(b.name || 'Your Name')}</h1>
      <div class="headline">${esc(b.headline || 'Professional Headline')}</div>
      <div class="meta">${contact.join('')}${links.join('')}</div>
    </header>
    <main>${sections}</main>
  </div>
</body>
</html>`;
}

const CompactOnePager: React.FC<Props> = ({ draft }) => {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visible = draft.sectionVisibility || {};

  const sectionMap: Record<CvSectionKey, React.ReactNode> = {
    summary: draft.summary ? (
      <section>
        <h3 className="cv-section-title">Summary</h3>
        <p className="cv-body text-[11px]">{draft.summary}</p>
      </section>
    ) : null,
    skills: draft.skills?.length ? (
      <section>
        <h3 className="cv-section-title">Skills</h3>
        <p className="text-[10px] text-gray-600">{draft.skills.join(' • ')}</p>
      </section>
    ) : null,
    experience: draft.experience?.length ? (
      <section>
        <h3 className="cv-section-title">Experience</h3>
        <div className="space-y-2">
          {draft.experience.map((exp, idx) => (
            <div key={`${exp.company}-${idx}`}>
              <div className="text-[11px] font-semibold">
                {exp.role || 'Role'} · {exp.company || 'Company'}
              </div>
              <div className="text-[10px] text-gray-500">
                {exp.start} - {exp.end}
              </div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[10px] text-gray-600">
                {exp.bullets?.map((bullet, bulletIdx) => (
                  <li key={`${exp.company}-${bulletIdx}`}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    ) : null,
    education: draft.education?.length ? (
      <section>
        <h3 className="cv-section-title">Education</h3>
        <div className="space-y-2 text-[10px] text-gray-600">
          {draft.education.map((edu, idx) => (
            <div key={`${edu.school}-${idx}`}>
              <span className="font-semibold">{edu.program || 'Program'}</span>
              <span> · {edu.school || 'School'}</span>
              <span className="text-gray-400"> ({edu.start} - {edu.end})</span>
            </div>
          ))}
        </div>
      </section>
    ) : null,
    projects: draft.projects?.length ? (
      <section>
        <h3 className="cv-section-title">Projects</h3>
        <div className="space-y-2 text-[10px] text-gray-600">
          {draft.projects.map((project, idx) => (
            <div key={`${project.name}-${idx}`}>
              <span className="font-semibold">{project.name || 'Project'}</span>
              {project.description ? ` — ${project.description}` : ''}
            </div>
          ))}
        </div>
      </section>
    ) : null,
    certifications: draft.certifications?.length ? (
      <section>
        <h3 className="cv-section-title">Certifications</h3>
        <div className="space-y-1 text-[10px] text-gray-600">
          {draft.certifications.map((cert, idx) => (
            <div key={`${cert.name}-${idx}`}>
              {cert.name} {cert.year ? `(${cert.year})` : ''}
            </div>
          ))}
        </div>
      </section>
    ) : null,
    extras: draft.extras ? (
      <section>
        <h3 className="cv-section-title">Extras</h3>
        <div className="space-y-1 text-[10px] text-gray-600">
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

  return (
    <div className="grid gap-4 p-6 text-[11px]">
      <header className="text-center">
        <h1 className="text-2xl font-semibold">{draft.basics.name || 'Your Name'}</h1>
        <p className="text-xs text-gray-600">{draft.basics.headline || 'Professional Headline'}</p>
        <div className="mt-1 flex flex-wrap justify-center gap-3 text-[10px] text-gray-500">
          <span>{draft.basics.email}</span>
          <span>{draft.basics.phone}</span>
          <span>{draft.basics.location}</span>
        </div>
      </header>
      <div className="grid gap-4">
        {order.map((key) => (visible[key] !== false ? sectionMap[key] : null))}
      </div>
    </div>
  );
};

export default CompactOnePager;
