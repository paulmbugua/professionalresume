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

export function renderCreativeTimelineHtml(draft: CvDraft): string {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visibility = draft.sectionVisibility || {};
  const isVisible = (k: CvSectionKey) => visibility[k] !== false;
  const b = draft.basics || {};

  const sectionMap: Record<CvSectionKey, string> = {
    summary: draft.summary?.trim() ? `<section><h2>Summary</h2><p>${esc(draft.summary)}</p></section>` : '',
    skills: draft.skills?.length
      ? `<section><h2>Skills</h2><div class="chips">${draft.skills.map((s) => `<span>${esc(s)}</span>`).join('')}</div></section>`
      : '',
    experience: draft.experience?.length
      ? `<section><h2>Experience Timeline</h2><div class="timeline">${draft.experience
          .map((exp, idx) => {
            const bullets = exp.bullets?.length
              ? `<ul>${exp.bullets.filter(Boolean).map((bullet) => `<li>${esc(bullet)}</li>`).join('')}</ul>`
              : '';
            return `<article data-k="${esc(`${safeKey(exp.company)}|${idx}`)}"><h3>${esc(exp.role || 'Role')} · ${esc(exp.company || 'Company')}</h3><div class="meta">${esc(exp.start || '')}${exp.start || exp.end ? ' - ' : ''}${esc(exp.end || '')}${exp.location ? ` • ${esc(exp.location)}` : ''}</div>${bullets}</article>`;
          })
          .join('')}</div></section>`
      : '',
    education: draft.education?.length
      ? `<section><h2>Education</h2><div class="stack">${draft.education
          .map((edu, idx) => `<article data-k="${esc(`${safeKey(edu.school)}|${idx}`)}"><h3>${esc(edu.program || 'Program')}</h3><div class="meta">${esc(edu.school || 'School')} · ${esc(edu.start || '')}${edu.start || edu.end ? ' - ' : ''}${esc(edu.end || '')}</div></article>`)
          .join('')}</div></section>`
      : '',
    projects: draft.projects?.length
      ? `<section><h2>Projects</h2><div class="stack">${draft.projects
          .map((project, idx) => `<article data-k="${esc(`${safeKey(project.name)}|${idx}`)}"><h3>${esc(project.name || 'Project')}</h3>${project.description ? `<p>${esc(project.description)}</p>` : ''}</article>`)
          .join('')}</div></section>`
      : '',
    certifications: draft.certifications?.length
      ? `<section><h2>Certifications</h2><div class="stack">${draft.certifications
          .map((cert) => `<p><strong>${esc(cert.name || '')}</strong>${cert.issuer ? ` · ${esc(cert.issuer)}` : ''}${cert.year ? ` (${esc(cert.year)})` : ''}</p>`)
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
  body{margin:0;background:#eef2ff;font-family:Inter,system-ui,Arial;color:#0f172a}
  .page{width:210mm;min-height:297mm;margin:12px auto;background:#fff;padding:14mm;box-shadow:0 10px 28px rgba(15,23,42,.12)}
  header{padding:14px 16px;border-radius:16px;background:linear-gradient(90deg,#4f46e5,#7c3aed);color:#fff}
  h1{margin:0;font-size:25px}
  .headline{margin-top:4px;font-size:12px;color:#ddd6fe}
  .contact{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px 12px;font-size:10px;color:#e9d5ff}
  main{margin-top:12px;display:grid;gap:12px}
  h2{margin:0 0 7px;font-size:11px;letter-spacing:.08em;text-transform:uppercase}
  .timeline{position:relative;padding-left:18px;display:grid;gap:10px}
  .timeline:before{content:'';position:absolute;left:4px;top:2px;bottom:4px;width:2px;background:#c7d2fe}
  .timeline article{position:relative}
  .timeline article:before{content:'';position:absolute;left:-18px;top:4px;width:10px;height:10px;border-radius:999px;background:#4f46e5;border:2px solid #fff}
  h3{margin:0;font-size:12px}
  .meta{font-size:10px;color:#64748b;margin-top:2px}
  p{margin:3px 0 0;font-size:11px;color:#475569;line-height:1.45}
  .chips{display:flex;flex-wrap:wrap;gap:6px}
  .chips span{padding:4px 8px;border:1px solid #dbeafe;border-radius:999px;font-size:10px;background:#f8fafc}
  ul{margin:5px 0 0;padding-left:16px;font-size:11px;color:#475569}
  .stack{display:grid;gap:9px}
  @page{size:A4;margin:10mm}
</style>
</head>
<body>
  <div class="page">
    <header>
      <h1>${esc(b.name || 'Your Name')}</h1>
      <div class="headline">${esc(b.headline || 'Professional Headline')}</div>
      <div class="contact">${[b.email, b.phone, b.location].filter(Boolean).map((item) => `<span>${esc(item)}</span>`).join('')}${(b.links || []).filter((l) => (l?.label || l?.url)?.trim()).map((l, idx) => `<span data-k="${esc(`${safeKey(l.label || l.url)}|${idx}`)}">${esc(l.label || l.url || '')}</span>`).join('')}</div>
    </header>
    <main>${sections}</main>
  </div>
</body>
</html>`;
}

const CreativeTimeline: React.FC<Props> = ({ draft }) => {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visible = draft.sectionVisibility || {};

  const sectionMap: Record<CvSectionKey, React.ReactNode> = {
    summary: draft.summary ? (
      <section>
        <h3 className="cv-section-title">Summary</h3>
        <p className="cv-body">{draft.summary}</p>
      </section>
    ) : null,
    skills: draft.skills?.length ? (
      <section>
        <h3 className="cv-section-title">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {draft.skills.map((skill) => (
            <span key={skill} className="rounded-full border border-gray-200 px-3 py-1 text-[10px]">
              {skill}
            </span>
          ))}
        </div>
      </section>
    ) : null,
    experience: draft.experience?.length ? (
      <section>
        <h3 className="cv-section-title">Experience Timeline</h3>
        <div className="space-y-4 border-l border-gray-200 pl-4">
          {draft.experience.map((exp, idx) => (
            <div key={`${exp.company}-${idx}`} className="relative">
              <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary" />
              <div className="text-sm font-semibold">
                {exp.role || 'Role'} · {exp.company || 'Company'}
              </div>
              <div className="text-xs text-gray-500">
                {exp.start} - {exp.end} {exp.location ? `• ${exp.location}` : ''}
              </div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-gray-600">
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
        <div className="space-y-3">
          {draft.education.map((edu, idx) => (
            <div key={`${edu.school}-${idx}`}>
              <div className="text-sm font-semibold">{edu.program || 'Program'}</div>
              <div className="text-xs text-gray-500">
                {edu.school || 'School'} · {edu.start} - {edu.end}
              </div>
            </div>
          ))}
        </div>
      </section>
    ) : null,
    projects: draft.projects?.length ? (
      <section>
        <h3 className="cv-section-title">Projects</h3>
        <div className="space-y-3">
          {draft.projects.map((project, idx) => (
            <div key={`${project.name}-${idx}`}>
              <div className="text-sm font-semibold">{project.name || 'Project'}</div>
              <p className="text-xs text-gray-600">{project.description}</p>
            </div>
          ))}
        </div>
      </section>
    ) : null,
    certifications: draft.certifications?.length ? (
      <section>
        <h3 className="cv-section-title">Certifications</h3>
        <div className="space-y-1 text-xs text-gray-600">
          {draft.certifications.map((cert, idx) => (
            <div key={`${cert.name}-${idx}`}>
              {cert.name} {cert.issuer ? `· ${cert.issuer}` : ''} {cert.year ? `(${cert.year})` : ''}
            </div>
          ))}
        </div>
      </section>
    ) : null,
    extras: draft.extras ? (
      <section>
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

  return (
    <div className="p-8 text-[12px]">
      <header className="rounded-2xl bg-gradient-to-r from-primary to-secondary p-6 text-white">
        <h1 className="text-2xl font-semibold">{draft.basics.name || 'Your Name'}</h1>
        <p className="text-sm text-white/80">{draft.basics.headline || 'Professional Headline'}</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/70">
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

export default CreativeTimeline;
