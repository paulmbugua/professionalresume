import React from 'react';
import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';
import { defaultSectionOrder } from '../../../utils/cvDefaults';

type Props = {
  draft: CvDraft;
};

const ModernSidebar: React.FC<Props> = ({ draft }) => {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visible = draft.sectionVisibility || {};

  const sidebarKeys: CvSectionKey[] = ['summary', 'skills', 'certifications', 'extras'];
  const mainKeys = order.filter((key) => !sidebarKeys.includes(key));

  const sectionMap: Record<CvSectionKey, React.ReactNode> = {
    summary: draft.summary ? (
      <section>
        <h3 className="cv-section-title text-gray-800">Summary</h3>
        <p className="cv-body text-gray-700">{draft.summary}</p>
      </section>
    ) : null,
    skills: draft.skills?.length ? (
      <section>
        <h3 className="cv-section-title text-gray-800">Skills</h3>
        <div className="flex flex-wrap gap-1">
          {draft.skills.map((skill) => (
            <span key={skill} className="rounded-full bg-white/70 px-2 py-1 text-[10px]">
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
              <div className="text-xs text-gray-500">
                {exp.start} - {exp.end} {exp.location ? `• ${exp.location}` : ''}
              </div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-gray-700">
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
              {edu.details && <p className="text-xs text-gray-600">{edu.details}</p>}
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
                <p className="text-xs text-gray-600">{project.description}</p>
              )}
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-gray-700">
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
        <div className="space-y-1 text-xs text-gray-700">
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
        <div className="space-y-1 text-xs text-gray-700">
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
    <div className="grid min-h-[297mm] grid-cols-[32%_1fr] text-[12px]">
      <aside className="bg-slate-900 p-6 text-white">
        <h1 className="text-xl font-semibold">{draft.basics.name || 'Your Name'}</h1>
        <p className="text-xs text-slate-300">{draft.basics.headline || 'Professional Headline'}</p>
        <div className="mt-3 space-y-1 text-[10px] text-slate-200">
          <p>{draft.basics.email}</p>
          <p>{draft.basics.phone}</p>
          <p>{draft.basics.location}</p>
          {draft.basics.links?.map((link, idx) => (
            <p key={`${link.url}-${idx}`}>{link.label || link.url}</p>
          ))}
        </div>
        <div className="mt-5 space-y-4">
          {sidebarKeys.map((key) => (visible[key] ? sectionMap[key] : null))}
        </div>
      </aside>
      <main className="space-y-6 bg-white p-8">
        {mainKeys.map((key) => (visible[key] ? sectionMap[key] : null))}
      </main>
    </div>
  );
};

export default ModernSidebar;
