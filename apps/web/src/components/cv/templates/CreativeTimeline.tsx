import React from 'react';
import type { CvDraft, CvSectionKey } from '@mytutorapp/shared/types';
import { defaultSectionOrder } from '../../../utils/cvDefaults';

type Props = {
  draft: CvDraft;
};

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
        {order.map((key) => (visible[key] ? sectionMap[key] : null))}
      </div>
    </div>
  );
};

export default CreativeTimeline;
