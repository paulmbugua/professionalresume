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

export function renderModernSidebarHtml(draft: CvDraft): string {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visibility = draft.sectionVisibility || {};
  const isVisible = (k: CvSectionKey) => visibility[k] !== false;
  const sidebarKeys: CvSectionKey[] = ['summary', 'skills', 'certifications', 'extras'];
  const mainKeys = order.filter((key) => !sidebarKeys.includes(key));
  const b = draft.basics || {};
  const { cssVarBlock } = resolveDraftStyles(draft);

  const sectionMap: Record<CvSectionKey, string> = {
    summary:
      draft.summary?.trim() || draft.richText?.summary?.trim()
        ? `<section><h2>Summary</h2><p>${renderRichText(draft, 'summary', draft.summary || '')}</p></section>`
        : '',
    skills: draft.skills?.length
      ? `<section><h2>Skills</h2><div class="chips">${draft.skills.map((s) => `<span>${esc(s)}</span>`).join('')}</div></section>`
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
            return `<article data-k="${esc(`${safeKey(exp.company)}|${idx}`)}"><h3>${esc(exp.role || 'Role')} · ${esc(exp.company || 'Company')}</h3><div class="meta">${esc(exp.start || '')}${exp.start || exp.end ? ' - ' : ''}${esc(exp.end || '')}${exp.location ? ` • ${esc(exp.location)}` : ''}</div>${bullets}</article>`;
          })
          .join('')}</div></section>`
      : '',
    education: draft.education?.length
      ? `<section><h2>Education</h2><div class="stack">${draft.education
          .map(
            (edu, idx) =>
              `<article data-k="${esc(`${safeKey(edu.school)}|${idx}`)}"><h3>${esc(edu.program || 'Program')}</h3><div class="meta">${esc(edu.school || 'School')} · ${esc(edu.start || '')}${edu.start || edu.end ? ' - ' : ''}${esc(edu.end || '')}</div>${edu.details ? `<p>${esc(edu.details)}</p>` : ''}</article>`
          )
          .join('')}</div></section>`
      : '',
    projects: draft.projects?.length
      ? `<section><h2>Projects</h2><div class="stack">${draft.projects
          .map((project, idx) => {
            const bullets = project.bullets?.length
              ? `<ul>${project.bullets
                  .filter(Boolean)
                  .map((bullet) => `<li>${esc(bullet)}</li>`)
                  .join('')}</ul>`
              : '';
            return `<article data-k="${esc(`${safeKey(project.name)}|${idx}`)}"><h3>${esc(project.name || 'Project')}</h3>${project.description ? `<p>${esc(project.description)}</p>` : ''}${bullets}</article>`;
          })
          .join('')}</div></section>`
      : '',
    certifications: draft.certifications?.length
      ? `<section><h2>Certifications</h2><div class="stack">${draft.certifications
          .map(
            (cert, idx) =>
              `<p data-k="${esc(`${safeKey(cert.name)}|${idx}`)}"><strong>${esc(cert.name || '')}</strong>${cert.issuer ? ` • ${esc(cert.issuer)}` : ''}${cert.year ? ` (${esc(cert.year)})` : ''}</p>`
          )
          .join('')}</div></section>`
      : '',
    extras: draft.extras
      ? `<section><h2>Extras</h2>${draft.extras.languages?.length ? `<p><strong>Languages:</strong> ${esc(draft.extras.languages.join(', '))}</p>` : ''}${draft.extras.interests?.length ? `<p><strong>Interests:</strong> ${esc(draft.extras.interests.join(', '))}</p>` : ''}</section>`
      : '',
  };

  const sidebar = sidebarKeys
    .map((k) => (isVisible(k) ? sectionMap[k] : ''))
    .filter(Boolean)
    .join('');
  const main = mainKeys
    .map((k) => (isVisible(k) ? sectionMap[k] : ''))
    .filter(Boolean)
    .join('');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  ${cssVarBlock}
  *{box-sizing:border-box}
  body{margin:0;background:#e2e8f0;font-family:var(--fontFamily);font-size:var(--baseFontSize);color:var(--textColor)}
  .page{width:210mm;min-height:297mm;margin:14px auto;display:grid;grid-template-columns:33% 1fr;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.14)}
  aside{background:var(--sidebarBg);color:var(--sidebarText);padding:14mm 8.5mm}
  main{padding:14mm 11mm;display:grid;gap:11px;align-content:start}
  h1{margin:0;font-size:calc(var(--h1Size) + 2px);line-height:1.04}
  .headline{margin-top:5px;font-size:14px;color:#cbd5e1}
  .contact{margin-top:11px;display:grid;gap:5px;font-size:var(--bodySize);color:#d7e1ef;line-height:1.4}
  section{margin-top:11px}
  h2{margin:0 0 7px;font-size:calc(var(--h3Size) + .9px);text-transform:uppercase;letter-spacing:.11em;color:inherit;opacity:.95}
  aside p, aside li{color:#e2e8f0}
  .chips{display:flex;flex-wrap:wrap;gap:6px}
  .chips span{font-size:var(--bodySize);padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22)}
  .stack{display:grid;gap:9px}
  h3{margin:0;font-size:calc(var(--h2Size) + .6px)}
  .meta{font-size:14px;color:#64748b;margin-top:3px}
  p{margin:3px 0 0;font-size:var(--bodySize);color:var(--textColor);line-height:1.5}
  ul{margin:6px 0 0;padding-left:18px;font-size:var(--bodySize);color:#475569;line-height:1.48}
  li{margin:3px 0}
  @page{size:A4;margin:8mm}
</style>
</head>
<body>
  <div class="page">
    <aside>
      <h1>${esc(b.name || 'Your Name')}</h1>
      <div class="headline">${esc(b.headline || 'Professional Headline')}</div>
      <div class="contact">${[b.email, b.phone, b.location]
        .filter(Boolean)
        .map((item) => `<div>${esc(item)}</div>`)
        .join('')}${(b.links || [])
        .filter((l) => (l?.label || l?.url)?.trim())
        .map(
          (l, idx) =>
            `<div data-k="${esc(`${safeKey(l.label || l.url)}|${idx}`)}">${esc(l.label || l.url || '')}</div>`
        )
        .join('')}</div>
      ${sidebar}
    </aside>
    <main>${main}</main>
  </div>
</body>
</html>`;
}

const ModernSidebar: React.FC<Props> = ({ draft }) => {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visible = draft.sectionVisibility || {};

  const sidebarKeys: CvSectionKey[] = ['summary', 'skills', 'certifications', 'extras'];
  const mainKeys = order.filter((key) => !sidebarKeys.includes(key));

  const sectionMap: Record<CvSectionKey, React.ReactNode> = {
    summary: draft.summary ? (
      <section>
        <h3 className="cv-section-title text-gray-800">Summary</h3>
        <p
          className="cv-body"
          dangerouslySetInnerHTML={renderRichTextReact(draft, 'summary', draft.summary || '')}
        />
      </section>
    ) : null,
    skills: draft.skills?.length ? (
      <section>
        <h3 className="cv-section-title text-gray-800">Skills</h3>
        <div className="flex flex-wrap gap-1">
          {draft.skills.map((skill) => (
            <span key={skill} className="rounded-full bg-white/70 px-2 py-1 text-[14px]">
              {skill}
            </span>
          ))}
        </div>
      </section>
    ) : null,
    experience: draft.experience?.length ? (
      <section>
        <h3 className="cv-section-title">Experience</h3>
        <div className="space-y-3">
          {draft.experience.map((exp, idx) => (
            <div key={`${exp.company}-${idx}`}>
              <div className="text-sm font-semibold">
                {exp.role || 'Role'} · {exp.company || 'Company'}
              </div>
              <div className="text-[14px] text-gray-500">
                {exp.start} - {exp.end} {exp.location ? `• ${exp.location}` : ''}
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
        <h3 className="cv-section-title">Education</h3>
        <div className="space-y-3">
          {draft.education.map((edu, idx) => (
            <div key={`${edu.school}-${idx}`}>
              <div className="text-sm font-semibold">{edu.program || 'Program'}</div>
              <div className="text-[14px] text-gray-500">
                {edu.school || 'School'} · {edu.start} - {edu.end}
              </div>
              {edu.details && <p className="text-[14px] text-gray-600">{edu.details}</p>}
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
              {project.description && (
                <p className="text-[14px] text-gray-600">{project.description}</p>
              )}
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[14px] text-gray-700">
                {project.bullets?.map((bullet, bulletIdx) => (
                  <li key={`${project.name}-${bulletIdx}`}>{bullet}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    ) : null,
    certifications: draft.certifications?.length ? (
      <section>
        <h3 className="cv-section-title text-gray-800">Certifications</h3>
        <div className="space-y-1 text-[14px] text-gray-700">
          {draft.certifications.map((cert, idx) => (
            <div key={`${cert.name}-${idx}`}>
              <span className="font-semibold">{cert.name}</span>
              {cert.issuer ? ` • ${cert.issuer}` : ''} {cert.year ? `(${cert.year})` : ''}
            </div>
          ))}
        </div>
      </section>
    ) : null,
    extras: draft.extras ? (
      <section>
        <h3 className="cv-section-title text-gray-800">Extras</h3>
        <div className="space-y-1 text-[14px] text-gray-700">
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
    <div className="grid min-h-[297mm] grid-cols-[32%_1fr]" style={cssVars as React.CSSProperties}>
      <aside
        className="p-6"
        style={{
          backgroundColor: 'var(--sidebarBg)',
          color: 'var(--sidebarText)',
          fontSize: 'var(--baseFontSize)',
        }}
      >
        <h1 className="text-xl font-semibold">{draft.basics.name || 'Your Name'}</h1>
        <p className="text-[14px] text-slate-300">
          {draft.basics.headline || 'Professional Headline'}
        </p>
        <div className="mt-3 space-y-1 text-[14px] text-slate-200">
          <p>{draft.basics.email}</p>
          <p>{draft.basics.phone}</p>
          <p>{draft.basics.location}</p>
          {draft.basics.links?.map((link, idx) => (
            <p key={`${link.url}-${idx}`}>{link.label || link.url}</p>
          ))}
        </div>
        <div className="mt-5 space-y-4">
          {sidebarKeys.map((key) => (visible[key] !== false ? sectionMap[key] : null))}
        </div>
      </aside>
      <main
        className="space-y-6 bg-white p-8"
        style={{ color: 'var(--textColor)', fontSize: 'var(--bodySize)' }}
      >
        {mainKeys.map((key) => (visible[key] !== false ? sectionMap[key] : null))}
      </main>
    </div>
  );
};

export default ModernSidebar;
