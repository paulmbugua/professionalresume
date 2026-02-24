import React from 'react';
import type { CvDraft, CvSectionKey } from '@cvpro/shared/types';
import { defaultSectionOrder } from '../../../utils/cvDefaults';

type Props = {
  draft: CvDraft;
};

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
        {order.map((key) => (visible[key] ? sectionMap[key] : null))}
      </div>
    </div>
  );
};

export default CompactOnePager;
