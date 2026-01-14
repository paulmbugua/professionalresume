import React from 'react';
import type { CvDraft, CvSectionKey } from '@mytutorapp/shared/types';
import { defaultSectionOrder } from '../../../utils/cvDefaults';

type Props = {
  draft: CvDraft;
};

const BoldHeader: React.FC<Props> = ({ draft }) => {
  const order = draft.sectionOrder?.length ? draft.sectionOrder : defaultSectionOrder;
  const visible = draft.sectionVisibility || {};

  const sectionMap: Record<CvSectionKey, React.ReactNode> = {
    summary: draft.summary ? (
      <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <h3 className="cv-section-title">Summary</h3>
        <p className="cv-body">{draft.summary}</p>
      </section>
    ) : null,
    skills: draft.skills?.length ? (
      <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <h3 className="cv-section-title">Skills</h3>
        <div className="flex flex-wrap gap-2">
          {draft.skills.map((skill) => (
            <span key={skill} className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold text-gray-700">
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
                <span>{exp.role || 'Role'} · {exp.company || 'Company'}</span>
                <span className="text-xs text-gray-500">{exp.start} - {exp.end}</span>
              </div>
              <ul className="list-disc space-y-1 pl-4 text-xs text-gray-600">
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
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <h3 className="cv-section-title">Education</h3>
        <div className="space-y-3">
          {draft.education.map((edu, idx) => (
            <div key={`${edu.school}-${idx}`}>
              <div className="flex flex-wrap items-center justify-between text-sm font-semibold">
                <span>{edu.program || 'Program'} · {edu.school || 'School'}</span>
                <span className="text-xs text-gray-500">{edu.start} - {edu.end}</span>
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
              <p className="text-xs text-gray-600">{project.description}</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-gray-600">
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
      <section className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <h3 className="cv-section-title">Certifications</h3>
        <div className="space-y-1 text-xs text-gray-600">
          {draft.certifications.map((cert, idx) => (
            <div key={`${cert.name}-${idx}`} className="flex items-center justify-between">
              <span className="font-semibold">{cert.name}</span>
              <span>{cert.issuer} {cert.year ? `• ${cert.year}` : ''}</span>
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

  return (
    <div className="p-8 text-[12px]">
      <header className="rounded-2xl bg-slate-900 p-6 text-white">
        <h1 className="text-3xl font-semibold">{draft.basics.name || 'Your Name'}</h1>
        <p className="text-sm text-slate-200">{draft.basics.headline || 'Professional Headline'}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
          <span>{draft.basics.email}</span>
          <span>{draft.basics.phone}</span>
          <span>{draft.basics.location}</span>
        </div>
      </header>
      <div className="mt-6 grid gap-4">
        {order.map((key) => (visible[key] ? sectionMap[key] : null))}
      </div>
    </div>
  );
};

export default BoldHeader;
