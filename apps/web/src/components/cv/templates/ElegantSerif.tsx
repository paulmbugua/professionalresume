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

export function renderElegantSerifHtml(draft: CvDraft): string {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visibility = draft.sectionVisibility || {};
  const isVisible = (k: CvSectionKey) => visibility[k] !== false;
  const b = draft.basics || {};

  const sectionMap: Record<CvSectionKey, string> = {
    summary: draft.summary?.trim()
      ? `<section><h2>Summary</h2><p>${esc(draft.summary)}</p></section>`
      : '',
    skills: draft.skills?.length
      ? `<section><h2>Skills</h2><p>${esc(draft.skills.join(' · '))}</p></section>`
      : '',
    experience: draft.experience?.length
      ? `<section><h2>Experience</h2><div class="stack">${draft.experience
          .map((exp, idx) => {
            const bullets = exp.bullets?.length
              ? `<ul>${exp.bullets
                  .filter(Boolean)
                  .map((bullet) => `<li>${esc(bullet)}</li>`)
                  .join('')}</ul>`
              : '';
            return `<article data-k="${esc(`${safeKey(exp.company)}|${idx}`)}"><div class="row"><strong>${esc(exp.role || 'Role')} · ${esc(exp.company || 'Company')}</strong><span>${esc(exp.start || '')}${exp.start || exp.end ? ' - ' : ''}${esc(exp.end || '')}</span></div>${bullets}</article>`;
          })
          .join('')}</div></section>`
      : '',
    education: draft.education?.length
      ? `<section><h2>Education</h2><div class="stack">${draft.education
          .map(
            (edu, idx) =>
              `<article data-k="${esc(`${safeKey(edu.school)}|${idx}`)}"><div class="row"><strong>${esc(edu.program || 'Program')} · ${esc(edu.school || 'School')}</strong><span>${esc(edu.start || '')}${edu.start || edu.end ? ' - ' : ''}${esc(edu.end || '')}</span></div>${edu.details ? `<p>${esc(edu.details)}</p>` : ''}</article>`
          )
          .join('')}</div></section>`
      : '',
    projects: draft.projects?.length
      ? `<section><h2>Projects</h2><div class="stack">${draft.projects
          .map(
            (project, idx) =>
              `<article data-k="${esc(`${safeKey(project.name)}|${idx}`)}"><strong>${esc(project.name || 'Project')}</strong>${project.description ? `<p>${esc(project.description)}</p>` : ''}</article>`
          )
          .join('')}</div></section>`
      : '',
    certifications: draft.certifications?.length
      ? `<section><h2>Certifications</h2><div class="stack">${draft.certifications
          .map(
            (cert, idx) =>
              `<p data-k="${esc(`${safeKey(cert.name)}|${idx}`)}">${esc(cert.name || '')}${cert.issuer ? ` · ${esc(cert.issuer)}` : ''}${cert.year ? ` (${esc(cert.year)})` : ''}</p>`
          )
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
  body{margin:0;background:#f8fafc;font-family:Georgia,'Times New Roman',serif;color:#111827}
  .page{width:210mm;min-height:297mm;margin:14px auto;background:#fff;padding:14mm 14mm;box-shadow:0 10px 24px rgba(15,23,42,.08)}
  header{text-align:center;border-bottom:1px solid #d1d5db;padding-bottom:11px}
  h1{margin:0;font-size:36px;font-weight:600;line-height:1.02}
  .headline{margin-top:5px;font-size:14.8px;color:#4b5563}
  .meta{margin-top:9px;display:flex;flex-wrap:wrap;justify-content:center;gap:8px 12px;font-size:14px;color:#6b7280}
  main{margin-top:12px;display:grid;gap:11px}
  h2{margin:0 0 7px;font-size:13px;letter-spacing:.11em;text-transform:uppercase;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
  p{margin:2px 0 0;font-size:14px;line-height:1.54;color:#374151}
  .stack{display:grid;gap:9px}
  .row{display:flex;justify-content:space-between;gap:12px;align-items:baseline}
  strong{font-size:14px;font-weight:600}
  span{font-size:14px;color:#6b7280}
  ul{margin:6px 0 0;padding-left:19px;color:#374151;font-size:14px;line-height:1.5}
  li{margin:3px 0}
  @page{size:A4;margin:12mm}
</style>
</head>
<body>
  <div class="page">
    <header>
      <h1>${esc(b.name || 'Your Name')}</h1>
      <div class="headline">${esc(b.headline || 'Professional Headline')}</div>
      <div class="meta">${[b.email, b.phone, b.location]
        .filter(Boolean)
        .map((item) => `<span>${esc(item)}</span>`)
        .join('')}${(b.links || [])
        .filter((l) => (l?.label || l?.url)?.trim())
        .map(
          (l, idx) =>
            `<span data-k="${esc(`${safeKey(l.label || l.url)}|${idx}`)}">${esc(l.label || l.url || '')}</span>`
        )
        .join('')}</div>
    </header>
    <main>${sections}</main>
  </div>
</body>
</html>`;
}

const ElegantSerif: React.FC<Props> = ({ draft }) => {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visible = draft.sectionVisibility || {};

  const sectionMap: Record<CvSectionKey, React.ReactNode> = {
    summary: draft.summary ? (
      <section>
        <h3 className="cv-section-title font-serif">Summary</h3>
        <p className="cv-body text-gray-700">{draft.summary}</p>
      </section>
    ) : null,
    skills: draft.skills?.length ? (
      <section>
        <h3 className="cv-section-title font-serif">Skills</h3>
        <p className="cv-body text-gray-700">{draft.skills.join(' · ')}</p>
      </section>
    ) : null,
    experience: draft.experience?.length ? (
      <section>
        <h3 className="cv-section-title font-serif">Experience</h3>
        <div className="space-y-3">
          {draft.experience.map((exp, idx) => (
            <div key={`${exp.company}-${idx}`}>
              <div className="flex flex-wrap items-center justify-between text-sm font-semibold">
                <span>
                  {exp.role || 'Role'} · {exp.company || 'Company'}
                </span>
                <span className="text-[14px] text-gray-500">
                  {exp.start} - {exp.end}
                </span>
              </div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-700">
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
        <h3 className="cv-section-title font-serif">Education</h3>
        <div className="space-y-3">
          {draft.education.map((edu, idx) => (
            <div key={`${edu.school}-${idx}`}>
              <div className="flex flex-wrap items-center justify-between text-sm font-semibold">
                <span>
                  {edu.program || 'Program'} · {edu.school || 'School'}
                </span>
                <span className="text-[14px] text-gray-500">
                  {edu.start} - {edu.end}
                </span>
              </div>
              {edu.details && <p className="text-[14px] text-gray-600">{edu.details}</p>}
            </div>
          ))}
        </div>
      </section>
    ) : null,
    projects: draft.projects?.length ? (
      <section>
        <h3 className="cv-section-title font-serif">Projects</h3>
        <div className="space-y-3">
          {draft.projects.map((project, idx) => (
            <div key={`${project.name}-${idx}`}>
              <div className="text-sm font-semibold">{project.name || 'Project'}</div>
              <p className="text-[14px] text-gray-600">{project.description}</p>
            </div>
          ))}
        </div>
      </section>
    ) : null,
    certifications: draft.certifications?.length ? (
      <section>
        <h3 className="cv-section-title font-serif">Certifications</h3>
        <div className="space-y-1 text-[14px] text-gray-600">
          {draft.certifications.map((cert, idx) => (
            <div key={`${cert.name}-${idx}`}>
              {cert.name} {cert.issuer ? `· ${cert.issuer}` : ''}{' '}
              {cert.year ? `(${cert.year})` : ''}
            </div>
          ))}
        </div>
      </section>
    ) : null,
    extras: draft.extras ? (
      <section>
        <h3 className="cv-section-title font-serif">Extras</h3>
        <div className="space-y-1 text-[14px] text-gray-600">
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
    <div className="p-10 font-serif text-[14px]">
      <header className="border-b border-gray-300 pb-4 text-center">
        <h1 className="text-3xl font-semibold">{draft.basics.name || 'Your Name'}</h1>
        <p className="text-sm text-gray-600">{draft.basics.headline || 'Professional Headline'}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3 text-[14px] text-gray-500">
          <span>{draft.basics.email}</span>
          <span>{draft.basics.phone}</span>
          <span>{draft.basics.location}</span>
        </div>
      </header>
      <div className="mt-6 space-y-5">
        {order.map((key) => (visible[key] !== false ? sectionMap[key] : null))}
      </div>
    </div>
  );
};

export default ElegantSerif;
